#!/usr/bin/env python3
"""
Questions Image Uploader Script
Processes questions for a given chapterId, extracts images from HTML content,
uploads them to Google Cloud Storage, and updates question documents.
"""

import os
import sys
import re
import json
import argparse
import logging
from typing import List, Dict, Tuple, Optional
from urllib.parse import urlparse, urlunparse
from io import BytesIO

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from google.cloud import storage
from google.cloud.exceptions import GoogleCloudError

# Load environment variables from Services/.env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class QuestionsImageUploader:
    def __init__(self):
        """Initialize the uploader with MongoDB and GCS connections"""
        # MongoDB setup
        self.mongo_uri = os.getenv('MONGO_URI')
        if not self.mongo_uri:
            raise ValueError("MONGO_URI environment variable not found")
        
        self.client = MongoClient(self.mongo_uri)
        self.db = self.client.projectx
        self.questions_collection = self.db.questions
        
        # GCS setup
        bucket_name = os.getenv('GCP_BUCKET_NAME', 'quesimage')
        self.bucket_name = bucket_name
        
        # Initialize GCS client
        # Check for credentials file in priority order:
        # 1. GOOGLE_APPLICATION_CREDENTIALS env var
        # 2. Service account JSON files in Services/env/
        # 3. Default service account path
        # 4. Default credentials (gcloud auth)
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        
        if credentials_path and os.path.exists(credentials_path):
            logger.info(f"Using credentials from GOOGLE_APPLICATION_CREDENTIALS: {credentials_path}")
            try:
                self.storage_client = storage.Client.from_service_account_json(credentials_path)
            except Exception as e:
                logger.error(f"Failed to load credentials from {credentials_path}: {e}")
                raise ValueError(f"Invalid service account file. Please ensure it's a service account JSON, not OAuth2 client secret.")
        else:
            # Try to find service account JSON files in Services/env/
            env_dir = os.path.join(os.path.dirname(__file__), 'env')
            service_account_path = None
            
            if os.path.exists(env_dir):
                # Look for JSON files that might be service account keys
                for filename in os.listdir(env_dir):
                    if filename.endswith('.json'):
                        file_path = os.path.join(env_dir, filename)
                        try:
                            with open(file_path, 'r') as f:
                                creds_data = json.load(f)
                                # Check if it's a service account (has required fields)
                                if creds_data.get('type') == 'service_account' and 'client_email' in creds_data and 'private_key' in creds_data:
                                    service_account_path = file_path
                                    logger.info(f"Found service account file: {file_path}")
                                    break
                        except (json.JSONDecodeError, IOError):
                            continue
            
            if service_account_path:
                logger.info(f"Using service account from: {service_account_path}")
                self.storage_client = storage.Client.from_service_account_json(service_account_path)
            else:
                # Try default service account path
                default_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Backend', 'NodeOne', 'secret', 'projectx-467806-3e87594035d9.json')
                if os.path.exists(default_path):
                    logger.info(f"Using credentials from default path: {default_path}")
                    self.storage_client = storage.Client.from_service_account_json(default_path)
                else:
                    # Use default credentials (from environment or gcloud auth)
                    logger.info("Using default credentials (gcloud auth or environment)")
                    try:
                        self.storage_client = storage.Client()
                    except Exception as e:
                        logger.error("\n" + "="*70)
                        logger.error("GCS Authentication Failed!")
                        logger.error("="*70)
                        logger.error("You need a Google Cloud Service Account JSON key file.")
                        logger.error("\nOptions:")
                        logger.error("1. Set GOOGLE_APPLICATION_CREDENTIALS env var to point to service account JSON")
                        logger.error("2. Place a service account JSON file in Services/env/ directory")
                        logger.error("3. Run 'gcloud auth application-default login' to use default credentials")
                        logger.error("\nNote: OAuth2 client_secret.json files won't work.")
                        logger.error("You need a service account key with 'type': 'service_account'")
                        logger.error("="*70)
                        raise
        
        self.bucket = self.storage_client.bucket(self.bucket_name)
        
        logger.info(f"Initialized QuestionsImageUploader")
        logger.info(f"MongoDB URI: {self.mongo_uri[:20]}...")
        logger.info(f"GCS Bucket: {self.bucket_name}")
    
    def get_file_extension(self, url: str, content_type: Optional[str] = None) -> str:
        """Extract file extension from URL or Content-Type"""
        # Try to get extension from URL
        parsed = urlparse(url)
        path = parsed.path
        if path:
            # Remove query parameters and get extension
            base_path = path.split('?')[0]
            if '.' in base_path:
                ext = '.' + base_path.rsplit('.', 1)[1].lower()
                # Validate extension
                valid_extensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']
                if ext in valid_extensions:
                    return ext
        
        # Try Content-Type
        if content_type:
            mime_to_ext = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/webp': '.webp',
                'image/gif': '.gif',
                'image/svg+xml': '.svg'
            }
            if content_type in mime_to_ext:
                return mime_to_ext[content_type]
        
        # Default to .png
        return '.png'
    
    def extract_images_from_html(self, html_content: str) -> List[Dict]:
        """Extract all image tags and their src attributes from HTML"""
        if not html_content:
            return []
        
        soup = BeautifulSoup(html_content, 'html.parser')
        images = []
        
        for img_tag in soup.find_all('img'):
            src = img_tag.get('src', '')
            if src:
                images.append({
                    'tag': img_tag,
                    'src': src,
                    'original_tag': str(img_tag)
                })
        
        return images
    
    def download_image(self, url: str) -> Tuple[bytes, Optional[str]]:
        """Download image from URL and return bytes and content type"""
        try:
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', '').split(';')[0].strip()
            image_data = response.content
            
            logger.debug(f"Downloaded image from {url[:50]}... ({len(image_data)} bytes)")
            return image_data, content_type
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download image from {url}: {str(e)}")
            raise
    
    def upload_to_gcs(self, image_data: bytes, destination_path: str, content_type: Optional[str] = None) -> str:
        """Upload image to GCS and return public URL"""
        try:
            # Determine content type from extension if not provided
            if not content_type:
                ext = os.path.splitext(destination_path)[1].lower()
                ext_to_mime = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.webp': 'image/webp',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml'
                }
                content_type = ext_to_mime.get(ext, 'image/png')
            
            blob = self.bucket.blob(destination_path)
            blob.upload_from_string(image_data, content_type=content_type)
            
            # Make blob publicly readable (if bucket has uniform bucket-level access, this may not be needed)
            # blob.make_public()
            
            public_url = f"https://storage.googleapis.com/{self.bucket_name}/{destination_path}"
            logger.debug(f"Uploaded to GCS: {destination_path}")
            return public_url
        
        except GoogleCloudError as e:
            logger.error(f"Failed to upload to GCS {destination_path}: {str(e)}")
            raise
    
    def update_html_with_new_urls(self, html_content: str, image_replacements: List[Dict]) -> str:
        """Update HTML by renaming src to src_ori and setting new src"""
        if not html_content:
            return html_content
        
        soup = BeautifulSoup(html_content, 'html.parser')
        img_tags = soup.find_all('img')
        
        # Create a mapping of original src to replacement info
        replacement_map = {rep['original_src']: rep for rep in image_replacements}
        
        for img_tag in img_tags:
            original_src = img_tag.get('src', '')
            if original_src in replacement_map:
                rep = replacement_map[original_src]
                # Set src_ori to original URL
                img_tag['src_ori'] = original_src
                # Set new src to GCS URL
                img_tag['src'] = rep['new_url']
        
        return str(soup)
    
    def process_question(self, question: Dict, chapter_id: str) -> bool:
        """Process a single question: extract, download, upload images, and update document"""
        question_id = str(question['_id'])
        logger.info(f"Processing question {question_id}")
        
        try:
            update_fields = {}
            has_images = False
            
            # Process question images
            if question.get('ques'):
                ques_images = self.extract_images_from_html(question['ques'])
                if ques_images:
                    has_images = True
                    ques_replacements = []
                    for idx, img_info in enumerate(ques_images):
                        try:
                            # Download image
                            image_data, content_type = self.download_image(img_info['src'])
                            
                            # Determine extension
                            ext = self.get_file_extension(img_info['src'], content_type)
                            
                            # Create destination path
                            destination_path = f"{chapter_id}/{question_id}_ques_{idx}{ext}"
                            
                            # Upload to GCS
                            public_url = self.upload_to_gcs(image_data, destination_path, content_type)
                            
                            ques_replacements.append({
                                'original_src': img_info['src'],
                                'new_url': public_url
                            })
                            
                            logger.info(f"  Processed ques image {idx}: {destination_path}")
                        
                        except Exception as e:
                            logger.error(f"  Failed to process ques image {idx}: {str(e)}")
                            return False
                    
                    # Update ques HTML
                    if ques_replacements:
                        updated_ques = self.update_html_with_new_urls(question['ques'], ques_replacements)
                        update_fields['ques'] = updated_ques
            
            # Process option images
            if question.get('options'):
                options = question['options']
                updated_options = []
                for opt_idx, option_html in enumerate(options):
                    if option_html:
                        opt_images = self.extract_images_from_html(option_html)
                        if opt_images:
                            has_images = True
                            opt_replacements = []
                            for img_idx, img_info in enumerate(opt_images):
                                try:
                                    # Download image
                                    image_data, content_type = self.download_image(img_info['src'])
                                    
                                    # Determine extension
                                    ext = self.get_file_extension(img_info['src'], content_type)
                                    
                                    # Create destination path
                                    destination_path = f"{chapter_id}/{question_id}_option{opt_idx}_{img_idx}{ext}"
                                    
                                    # Upload to GCS
                                    public_url = self.upload_to_gcs(image_data, destination_path, content_type)
                                    
                                    opt_replacements.append({
                                        'original_src': img_info['src'],
                                        'new_url': public_url
                                    })
                                    
                                    logger.info(f"  Processed option {opt_idx} image {img_idx}: {destination_path}")
                                
                                except Exception as e:
                                    logger.error(f"  Failed to process option {opt_idx} image {img_idx}: {str(e)}")
                                    return False
                            
                            # Update option HTML
                            if opt_replacements:
                                updated_option = self.update_html_with_new_urls(option_html, opt_replacements)
                                updated_options.append(updated_option)
                            else:
                                updated_options.append(option_html)
                        else:
                            updated_options.append(option_html)
                    else:
                        updated_options.append(option_html)
                
                # Only update options if we modified any
                if any(opt != orig for opt, orig in zip(updated_options, question.get('options', []))):
                    update_fields['options'] = updated_options
            
            # Process solution images
            if question.get('solution'):
                solution_images = self.extract_images_from_html(question['solution'])
                if solution_images:
                    has_images = True
                    solution_replacements = []
                    for idx, img_info in enumerate(solution_images):
                        try:
                            # Download image
                            image_data, content_type = self.download_image(img_info['src'])
                            
                            # Determine extension
                            ext = self.get_file_extension(img_info['src'], content_type)
                            
                            # Create destination path
                            destination_path = f"{chapter_id}/{question_id}_solution_{idx}{ext}"
                            
                            # Upload to GCS
                            public_url = self.upload_to_gcs(image_data, destination_path, content_type)
                            
                            solution_replacements.append({
                                'original_src': img_info['src'],
                                'new_url': public_url
                            })
                            
                            logger.info(f"  Processed solution image {idx}: {destination_path}")
                        
                        except Exception as e:
                            logger.error(f"  Failed to process solution image {idx}: {str(e)}")
                            return False
                    
                    # Update solution HTML
                    if solution_replacements:
                        updated_solution = self.update_html_with_new_urls(question['solution'], solution_replacements)
                        update_fields['solution'] = updated_solution
            
            # Update document in MongoDB
            update_fields['imageStoring'] = True
            self.questions_collection.update_one(
                {'_id': question['_id']},
                {'$set': update_fields}
            )
            
            if has_images:
                logger.info(f"Successfully updated question {question_id} with {len(update_fields) - 1} field(s) modified")
            else:
                logger.info(f"Question {question_id} has no images, marked as processed")
            
            return True
        
        except Exception as e:
            logger.error(f"Error processing question {question_id}: {str(e)}")
            # Mark as failed
            self.questions_collection.update_one(
                {'_id': question['_id']},
                {'$set': {'imageStoring': False}}
            )
            return False
    
    def process_chapter_questions(self, chapter_id: str, skip_processed: bool = True):
        """Process all questions for a given chapterId"""
        try:
            chapter_obj_id = ObjectId(chapter_id)
        except Exception:
            logger.error(f"Invalid chapterId format: {chapter_id}")
            return
        
        logger.info(f"Processing questions for chapterId: {chapter_id}")
        
        # Build query
        query = {'chapterId': chapter_obj_id}
        if skip_processed:
            query['imageStoring'] = {'$ne': True}
        
        # Get questions
        questions = list(self.questions_collection.find(query))
        total_questions = len(questions)
        
        logger.info(f"Found {total_questions} questions to process")
        
        if total_questions == 0:
            logger.info("No questions to process")
            return
        
        # Process each question
        success_count = 0
        failure_count = 0
        
        for idx, question in enumerate(questions, 1):
            logger.info(f"Processing question {idx}/{total_questions}")
            if self.process_question(question, chapter_id):
                success_count += 1
            else:
                failure_count += 1
            logger.info(f"Progress: {idx}/{total_questions} processed | success: {success_count} | failed: {failure_count}")
        
        logger.info(f"Processing complete!")
        logger.info(f"Success: {success_count}, Failed: {failure_count}, Total: {total_questions}")
    
    def test_question(self, question_id: str, dry_run: bool = False) -> bool:
        """Test processing a single question by questionId"""
        try:
            try:
                question_obj_id = ObjectId(question_id)
            except Exception:
                logger.error(f"Invalid questionId format: {question_id}")
                return False
            
            logger.info(f"=== TEST MODE: Processing question {question_id} ===")
            if dry_run:
                logger.info("DRY RUN MODE: No changes will be saved to database")
            
            # Fetch question from database
            question = self.questions_collection.find_one({'_id': question_obj_id})
            if not question:
                logger.error(f"Question {question_id} not found in database")
                return False
            
            # Get chapterId from question
            chapter_id = str(question.get('chapterId', ''))
            if not chapter_id:
                logger.error(f"Question {question_id} has no chapterId")
                return False
            
            logger.info(f"Found question {question_id} in chapter {chapter_id}")
            
            # Analyze the question before processing
            logger.info("\n--- Question Analysis ---")
            ques_images = self.extract_images_from_html(question.get('ques', '')) if question.get('ques') else []
            logger.info(f"Question text images: {len(ques_images)}")
            
            option_images_count = 0
            if question.get('options'):
                for opt_idx, option_html in enumerate(question.get('options', [])):
                    if option_html:
                        opt_imgs = self.extract_images_from_html(option_html)
                        if opt_imgs:
                            logger.info(f"Option {opt_idx} images: {len(opt_imgs)}")
                            option_images_count += len(opt_imgs)
            
            solution_images = self.extract_images_from_html(question.get('solution', '')) if question.get('solution') else []
            logger.info(f"Solution images: {len(solution_images)}")
            total_images = len(ques_images) + option_images_count + len(solution_images)
            logger.info(f"Total images found: {total_images}")
            
            if total_images == 0:
                logger.warning("No images found in this question")
                return True
            
            # Show image URLs
            logger.info("\n--- Image URLs Found ---")
            if ques_images:
                for idx, img in enumerate(ques_images):
                    logger.info(f"  Ques image {idx}: {img['src'][:80]}...")
            
            if question.get('options'):
                for opt_idx, option_html in enumerate(question.get('options', [])):
                    if option_html:
                        opt_imgs = self.extract_images_from_html(option_html)
                        for img_idx, img in enumerate(opt_imgs):
                            logger.info(f"  Option {opt_idx} image {img_idx}: {img['src'][:80]}...")
            
            if solution_images:
                for idx, img in enumerate(solution_images):
                    logger.info(f"  Solution image {idx}: {img['src'][:80]}...")
            
            # Process the question
            logger.info("\n--- Processing Question ---")
            if dry_run:
                logger.info("DRY RUN: Would process images and update database")
                logger.info("Run without --dry-run to actually process")
                return True
            else:
                success = self.process_question(question, chapter_id)
                if success:
                    logger.info(f"\n=== TEST SUCCESS: Question {question_id} processed successfully ===")
                else:
                    logger.error(f"\n=== TEST FAILED: Question {question_id} processing failed ===")
                return success
        
        except Exception as e:
            logger.error(f"Error in test_question: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Upload question images to Google Cloud Storage')
    parser.add_argument('chapterId', nargs='?', help='Chapter ID to process')
    parser.add_argument('--reprocess', action='store_true', help='Reprocess questions even if imageStoring=true')
    parser.add_argument('--test', type=str, metavar='QUESTION_ID', help='Test mode: process a single question by questionId')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode: analyze but do not process (only with --test)')
    
    args = parser.parse_args()
    
    try:
        uploader = QuestionsImageUploader()
        
        # Test mode
        if args.test:
            success = uploader.test_question(args.test, dry_run=args.dry_run)
            sys.exit(0 if success else 1)
        
        # Normal mode - requires chapterId
        if not args.chapterId:
            parser.error("chapterId is required unless using --test mode")
        
        uploader.process_chapter_questions(args.chapterId, skip_processed=not args.reprocess)
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == '__main__':
    main()

