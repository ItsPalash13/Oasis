import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Box, Card, CardContent, CircularProgress, Grid, Typography, IconButton, Drawer, Collapse, Chip } from "@mui/material";
import { QuizHeader, QuestionCard, OptionCard, StyledButton, XpDisplay, quizStyles } from "../../theme/quizTheme";
import { ArrowBack as ArrowBackIcon, Star as StarIcon, BookmarkBorder, Bookmark, ChevronRight, ChevronLeft, BugReport, Close, CheckBox, RadioButtonChecked } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ProgressBar } from "react-progressbar-fancy";
import DOMPurify from 'dompurify';
import { renderTextWithLatex } from "../../utils/quesUtils";
import QuestionPalette from "./QuestionPalette";

// Import badge images
import bronzeBadge from '../../assets/badges/bronze.png';
import silverBadge from '../../assets/badges/silver.png';
import goldBadge from '../../assets/badges/gold.png';
import platinumBadge from '../../assets/badges/platinum.png';
import diamondBadge from '../../assets/badges/diamond.png';

const Quiz = ({ socket }) => {
	const navigate = useNavigate();
	const { quizId } = useParams();
	const quizSession = useSelector((state) => state?.quizSession?.session);
	const metadataList = useSelector((state) => state?.metadata?.metadataList || []);
	const chapterSessionsMap = useSelector((state) => state?.metadata?.chapterSessionsMap || {});
	const sessionId = quizSession?.id || quizId;
	const [isLoading, setIsLoading] = useState(true);
	const [questions, setQuestions] = useState([]);
	const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: answerIndex | answerIndex[] }
	const [quizSubmitted, setQuizSubmitted] = useState(false);
	const [quizResults, setQuizResults] = useState(null);
	const chapterId = quizResults?.chapterId || quizSession?.chapterId;
	const [currentScore, setCurrentScore] = useState(0);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [questionStates, setQuestionStates] = useState([]); // Array of {visited, answered, markedForReview}
	const questionRefs = useRef([]);
	const [paletteOpen, setPaletteOpen] = useState(true);
	const [paletteWidth, setPaletteWidth] = useState(350);
	const [debugBoxOpen, setDebugBoxOpen] = useState(false); // TEMPORARY: Debug box visibility state
	const currentQuestion = questions[currentQuestionIndex] || null;

	// Connect and fetch all questions
	useEffect(() => {
		if (!socket.connected) {
			socket.connect();
		}
		const onConnect = () => {
			socket.emit("initiate", { sessionId });
		};
		
		const onQuestions = (data) => {
			const questionsList = data.questions || [];
			setQuestions(questionsList);
			setSelectedAnswers({});
			
			// Initialize question states
			const initialStates = questionsList.map(() => ({
				visited: false,
				answered: false,
				markedForReview: false,
			}));
			
			// Mark first question as visited
			if (initialStates.length > 0) {
				initialStates[0].visited = true;
			}
			
			setQuestionStates(initialStates);
			
			// Initialize refs array
			questionRefs.current = questionsList.map((_, i) => {
				if (!questionRefs.current[i]) {
					questionRefs.current[i] = React.createRef();
				}
				return questionRefs.current[i];
			});
			
			setIsLoading(false);
			if (data.currentScore !== undefined) {
				setCurrentScore(data.currentScore);
			}
		};

		const onResults = (data) => {
			setQuizSubmitted(true);
			setQuizResults(data);
			setIsLoading(false);
		};

		const onQuizError = (data) => {
			console.error("Quiz error V3:", data);
			setIsLoading(false);
		};

		socket.on("connect", onConnect);
		socket.on("questions", onQuestions);
		socket.on("results", onResults);
		socket.on("quizError", onQuizError);

		return () => {
			socket.off("connect", onConnect);
			socket.off("questions", onQuestions);
			socket.off("results", onResults);
			socket.off("quizError", onQuizError);
			if (socket.connected) socket.disconnect();
		};
	}, [socket, quizId, sessionId]);

	const handleAnswerSelect = (questionId, answerIndex) => {
		if (quizSubmitted) return; // Don't allow changes after submission
		
		const question = questions.find(q => q.id === questionId);
		const isMulticorrect = question?.type === 'multicorrect';
		
		setSelectedAnswers(prev => {
			if (isMulticorrect) {
				// For multicorrect: toggle the selection
				const currentAnswers = prev[questionId] || [];
				const currentArray = Array.isArray(currentAnswers) ? currentAnswers : (currentAnswers !== null && currentAnswers !== undefined ? [currentAnswers] : []);
				
				const newAnswers = currentArray.includes(answerIndex)
					? currentArray.filter(idx => idx !== answerIndex) // Remove if already selected
					: [...currentArray, answerIndex]; // Add if not selected
				
				return {
					...prev,
					[questionId]: newAnswers.length > 0 ? newAnswers : null
				};
			} else {
				// For single: replace the selection
				return {
					...prev,
					[questionId]: answerIndex
				};
			}
		});
		
		// Update answered state
		const questionIndex = questions.findIndex(q => q.id === questionId);
		if (questionIndex !== -1) {
			setQuestionStates(prev => {
				const newStates = [...prev];
				if (newStates[questionIndex]) {
					newStates[questionIndex] = {
						...newStates[questionIndex],
						answered: true,
					};
				}
				return newStates;
			});
		}
	};

	const handleQuestionNavigate = useCallback((index) => {
		if (index < 0 || index >= questions.length) return;
		
		setCurrentQuestionIndex(index);
		
		// Mark as visited
		setQuestionStates(prev => {
			const newStates = [...prev];
			if (newStates[index]) {
				newStates[index] = {
					...newStates[index],
					visited: true,
				};
			}
			return newStates;
		});
		
		// Scroll to question
		if (questionRefs.current[index]?.current) {
			questionRefs.current[index].current.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		}
	}, [questions.length]);

	const handleMarkForReview = (questionId) => {
		if (quizSubmitted) return;
		
		const questionIndex = questions.findIndex(q => q.id === questionId);
		if (questionIndex !== -1) {
			setQuestionStates(prev => {
				const newStates = [...prev];
				if (newStates[questionIndex]) {
					newStates[questionIndex] = {
						...newStates[questionIndex],
						markedForReview: !newStates[questionIndex].markedForReview,
					};
				}
				return newStates;
			});
		}
	};

	// Rank progress data derived from homepage-fetched metadata and chapter session ratings
	const rankMetadata = useMemo(() => {
		return (metadataList || [])
			.filter((meta) => meta.metadataType === "Rank" && meta.minRank !== undefined && meta.maxRank !== undefined)
			.sort((a, b) => (a.minRank || 0) - (b.minRank || 0));
	}, [metadataList]);

	// Prefer rating returned with results; fallback to cached chapter sessions map
	const mapRating = useMemo(() => {
		if (!chapterId || !chapterSessionsMap) return null;
		const key = chapterId?.toString ? chapterId.toString() : chapterId;
		return chapterSessionsMap[key] ?? null;
	}, [chapterId, chapterSessionsMap]);

	const effectiveUserRating = quizResults?.userRating ?? mapRating;

	const rankProgress = useMemo(() => {
		if (!rankMetadata.length || effectiveUserRating === null || effectiveUserRating === undefined) return null;

		const current = rankMetadata.find(
			(rank) => effectiveUserRating >= rank.minRank && effectiveUserRating <= rank.maxRank
		);

		const next = rankMetadata.find((rank) => rank.minRank > effectiveUserRating);

		const progressPercent = next
			? Math.min(
					100,
					Math.max(
						0,
						((effectiveUserRating - (current?.minRank ?? 0)) / (next.minRank - (current?.minRank ?? 0))) * 100
					)
			  )
			: 100;

		const remainingToNext = next ? Math.max(0, next.minRank - effectiveUserRating) : 0;

		const progressRaw = Number.isFinite(progressPercent) ? progressPercent : 0;
		const progressRounded = Math.max(0, Math.min(100, Number.parseFloat(progressRaw.toFixed(2))));

		return {
			currentRankName: current?.metadataName || "Unranked",
			nextRankName: next?.metadataName || null,
			progressPercent: progressRounded,
			remainingToNext,
			nextMinRank: next?.minRank,
			ratingValue: effectiveUserRating ?? 0
		};
	}, [rankMetadata, effectiveUserRating]);

	// Map rank name to badge image
	const getBadgeImage = (rankName) => {
		if (!rankName) return null;
		const rankLower = rankName.toLowerCase();
		switch (rankLower) {
			case 'bronze':
				return bronzeBadge;
			case 'silver':
				return silverBadge;
			case 'gold':
				return goldBadge;
			case 'platinum':
				return platinumBadge;
			case 'diamond':
				return diamondBadge;
			default:
				return null;
		}
	};

	// Mark current question as visited when it changes
	useEffect(() => {
		if (questions.length === 0 || quizSubmitted) return;
		
		setQuestionStates(prev => {
			const newStates = [...prev];
			if (newStates[currentQuestionIndex] && !newStates[currentQuestionIndex].visited) {
				newStates[currentQuestionIndex] = {
					...newStates[currentQuestionIndex],
					visited: true,
				};
				return newStates;
			}
			return prev;
		});
	}, [currentQuestionIndex, questions.length, quizSubmitted]);

	const handleSubmit = () => {
		if (questions.length === 0) return;
		
		// Check if at least one question is answered
		const answeredCount = Object.values(selectedAnswers).filter(a => 
			a !== null && 
			a !== undefined && 
			!(Array.isArray(a) && a.length === 0)
		).length;
		if (answeredCount === 0) {
			alert("Please answer at least one question before submitting.");
			return;
		}

		if (window.confirm(`You have answered ${answeredCount} out of ${questions.length} questions. Submit now?`)) {
			setIsLoading(true);
			
			// Prepare answers array
			const answers = questions.map(q => {
				const answer = selectedAnswers[q.id];
				// For multicorrect, ensure it's an array; for single, ensure it's a number or null
				if (q.type === 'multicorrect') {
					return {
						questionId: q.id,
						answerIndex: Array.isArray(answer) ? answer : (answer !== null && answer !== undefined ? [answer] : null)
					};
				} else {
					return {
						questionId: q.id,
						answerIndex: Array.isArray(answer) ? answer[0] : (answer ?? null)
					};
				}
			});

			socket.emit("submit", { answers, sessionId });
		}
	};

	const handleBack = () => {
		navigate("/dashboard", { replace: true });
	};

	return (
		<Box sx={{ p: 2, overflowX: "hidden", width: "100%" }}>
			<QuizHeader>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					{!quizSubmitted && (
						<StyledButton
							variant="outlined"
							size="small"
							onClick={handleBack}
							sx={quizStyles.backButton}
						>
							<ArrowBackIcon fontSize="small" />
						</StyledButton>
					)}
				</Box>
				{!quizSubmitted && questions.length > 0 && (
					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						<StyledButton
							variant="contained"
							size="medium"
							onClick={handleSubmit}
							disabled={isLoading}
							sx={{
								px: 3,
								py: 1,
								fontSize: "0.9rem",
								fontWeight: 600,
							}}
						>
							Submit Quiz 
						</StyledButton>
					</Box>
				)}
			</QuizHeader>

			{isLoading && !quizSubmitted ? (
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
					<CircularProgress />
				</Box>
			) : quizSubmitted && quizResults ? (
				<>
					<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
						<StyledButton
							variant="outlined"
							size="small"
							onClick={handleBack}
							sx={quizStyles.backButton}
						>
							<ArrowBackIcon fontSize="small" />
						</StyledButton>
					</Box>
					<Box sx={{ mt: 3, maxWidth: 550, mx: "auto" }}>
						{/* Results Display */}
						<QuestionCard>
							<CardContent sx={{ p: 3 }}>
								{/* Header Message */}
								<Box sx={{ textAlign: "center", mb: 3 }}>
									<Typography
										variant="h4"
										sx={{
											fontWeight: "bold",
											mb: 0.5,
											color: "primary.main",
										}}
									>
										🎯
									</Typography>
									<Typography
										variant="h6"
										sx={{
											fontWeight: "bold",
											mb: 1,
											color: "primary.main",
										}}
									>
										Quiz Completed!
									</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
										Great effort! Here's how you performed.
									</Typography>
								</Box>

								{/* Score Display */}
								<Box
									sx={{
										display: "flex",
										justifyContent: "center",
										mb: 3,
									}}
								>
									<XpDisplay
										sx={{
											p: 2,
											minWidth: 200,
											justifyContent: "center",
											boxShadow: "0 6px 20px rgba(245, 158, 11, 0.35)",
										}}
									>
										<StarIcon sx={{ fontSize: "2rem" }} />
										<Box sx={{ ml: 1 }}>
											<Typography variant="h3" sx={{ fontWeight: "bold", lineHeight: 1, mb: 0.25 }}>
												{quizResults.currentScore || 0}
											</Typography>
											<Typography variant="body1" sx={{ fontWeight: "bold", opacity: 0.9 }}>
												Total Marks
											</Typography>
										</Box>
									</XpDisplay>
								</Box>

								{/* Stats Grid */}
								<Grid container spacing={2} sx={{ mb: 3 }}>
									<Grid size={{ xs: 6, sm: 3 }}>
										<Card
											sx={{
												textAlign: "center",
												p: 2,
												borderRadius: 2,
												background: (theme) =>
													theme.palette.mode === "dark"
														? "rgba(76, 175, 80, 0.15)"
														: "rgba(76, 175, 80, 0.1)",
												border: "2px solid",
												borderColor: "success.main",
												boxShadow: (theme) =>
													theme.palette.mode === "dark"
														? "0 4px 12px rgba(76, 175, 80, 0.2)"
														: "0 4px 12px rgba(76, 175, 80, 0.15)",
											}}
										>
											<Typography variant="h4" sx={{ fontWeight: "bold", color: "success.main", mb: 0.5 }}>
												{quizResults.questionsCorrect || 0}
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
												Correct
											</Typography>
										</Card>
									</Grid>
									<Grid size={{ xs: 6, sm: 3 }}>
										<Card
											sx={{
												textAlign: "center",
												p: 2,
												borderRadius: 2,
												background: (theme) =>
													theme.palette.mode === "dark"
														? "rgba(244, 67, 54, 0.15)"
														: "rgba(244, 67, 54, 0.1)",
												border: "2px solid",
												borderColor: "error.main",
												boxShadow: (theme) =>
													theme.palette.mode === "dark"
														? "0 4px 12px rgba(244, 67, 54, 0.2)"
														: "0 4px 12px rgba(244, 67, 54, 0.15)",
											}}
										>
											<Typography variant="h4" sx={{ fontWeight: "bold", color: "error.main", mb: 0.5 }}>
												{quizResults.questionsIncorrect || 0}
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
												Incorrect
											</Typography>
										</Card>
									</Grid>
									<Grid size={{ xs: 6, sm: 3 }}>
										<Card
											sx={{
												textAlign: "center",
												p: 2,
												borderRadius: 2,
												background: (theme) =>
													theme.palette.mode === "dark"
														? "rgba(255, 255, 255, 0.05)"
														: "rgba(0, 0, 0, 0.03)",
												border: (theme) =>
													theme.palette.mode === "dark"
														? "2px solid rgba(255, 255, 255, 0.1)"
														: "2px solid rgba(0, 0, 0, 0.1)",
											}}
										>
											<Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
												{quizResults.questionsAttempted || 0}
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
												Attempted
											</Typography>
										</Card>
									</Grid>
									<Grid size={{ xs: 6, sm: 3 }}>
										<Card
											sx={{
												textAlign: "center",
												p: 2,
												borderRadius: 2,
												background: (theme) =>
													theme.palette.mode === "dark"
														? "rgba(33, 150, 243, 0.15)"
														: "rgba(33, 150, 243, 0.1)",
												border: "2px solid",
												borderColor: "primary.main",
											}}
										>
											<Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main", mb: 0.5 }}>
												{quizResults.accuracy || 0}%
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
												Accuracy
											</Typography>
										</Card>
									</Grid>
								</Grid>
								{rankProgress && (
									<Box sx={{ mt: 3 }}>
										<Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
											Medal Progress
										</Typography>
										<Card
											sx={{
												p: 2,
												borderRadius: 2,
												background: (theme) =>
													theme.palette.mode === "dark"
														? "rgba(33, 150, 243, 0.08)"
														: "rgba(33, 150, 243, 0.06)",
												border: "1px solid",
												borderColor: "primary.main",
											}}
										>
											<CardContent sx={{ p: 2 }}>
												<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
													<Box>
														<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
															Current medal
														</Typography>
														<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
															{getBadgeImage(rankProgress.currentRankName) && (
																<img
																	src={getBadgeImage(rankProgress.currentRankName)}
																	alt={rankProgress.currentRankName}
																	style={{
																		width: 32,
																		height: 32,
																		objectFit: "contain",
																		filter: "drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2))",
																	}}
																/>
															)}
															<Typography variant="h6" sx={{ fontWeight: "bold", color: "primary.main" }}>
																{rankProgress.currentRankName}
															</Typography>
														</Box>
														<Typography variant="caption" color="text.secondary">
															Rating: {rankProgress.ratingValue ?? 0}
														</Typography>
													</Box>
													<Box sx={{ textAlign: "right" }}>
														<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
															Next medal
														</Typography>
														<Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
															{rankProgress.nextRankName && getBadgeImage(rankProgress.nextRankName) ? (
																<img
																	src={getBadgeImage(rankProgress.nextRankName)}
																	alt={rankProgress.nextRankName}
																	style={{
																		width: 32,
																		height: 32,
																		objectFit: "contain",
																		filter: "drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2))",
																	}}
																/>
															) : null}
															<Typography variant="h6" sx={{ fontWeight: "bold" }}>
																{rankProgress.nextRankName || "Max achieved"}
															</Typography>
														</Box>
														<Typography variant="caption" color="text.secondary">
															{rankProgress.nextRankName
																? `${rankProgress.remainingToNext} rating to ${rankProgress.nextRankName}`
																: "You are at the top medal"}
														</Typography>
													</Box>
												</Box>
												<ProgressBar
													score={rankProgress.progressPercent}
													progressWidth="100%"
													// label={`${rankProgress.progressPercent}%`}
													primaryColor="#2196f3"
													secondaryColor="#64b5f6"
													className="rank-progress-bar"
													darkTheme
												/>
											</CardContent>
										</Card>
									</Box>
								)}
							</CardContent>
						</QuestionCard>
					</Box>

					{/* Review Answers Section */}
					<Box sx={{ mt: 4, width: "100%", maxWidth: "1400px", mx: "auto", px: 3 }}>
						<QuestionCard>
							<CardContent sx={{ p: 3 }}>
								{/* Review Header */}
								<Box sx={{ textAlign: "center", mb: 3 }}>
									<Typography
										variant="h5"
										sx={{
											fontWeight: "bold",
											mb: 1,
											color: "primary.main",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: 1,
										}}
									>
										🎯 Review Answers - Quiz Completed!
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Here's how you performed. Scroll down to review your answers.
									</Typography>
								</Box>

								{/* Scrollable Questions Review */}
								{(() => {
									// Create a map for quick lookup of question results (created once outside the map)
									const questionResultsMap = new Map();
									if (quizResults?.questionResults) {
										quizResults.questionResults.forEach((result) => {
											questionResultsMap.set(result.questionId, result.isCorrect);
										});
									}

									return (
										<Box
											sx={{
												maxHeight: "60vh",
												overflowY: "auto",
												pr: 1,
												"&::-webkit-scrollbar": {
													width: "8px",
												},
												"&::-webkit-scrollbar-track": {
													background: (theme) =>
														theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
													borderRadius: "4px",
												},
												"&::-webkit-scrollbar-thumb": {
													background: (theme) =>
														theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
													borderRadius: "4px",
													"&:hover": {
														background: (theme) =>
															theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
													},
												},
											}}
										>
											{questions.map((question, questionIndex) => {
												// Convert question.id to string for comparison
												const questionIdStr = question.id?.toString();
												const userAnswerIndex = selectedAnswers[question.id];
												const isCorrect = questionResultsMap.get(questionIdStr) || false;
												const hasUserAnswer = userAnswerIndex !== null && userAnswerIndex !== undefined;

												return (
													<Box key={question.id} sx={{ mb: 4 }}>
														{/* Question Number and Text */}
														<Box sx={{ mb: 2 }}>
															<Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>
																Question {questionIndex + 1} of {questions.length}
															</Typography>
															{question.quesType === 'html' ? (
																<Typography 
																	variant="h6" 
																	sx={quizStyles.questionTitle}
																	dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.ques || '') }}
																/>
															) : (
																<Typography variant="h6" sx={quizStyles.questionTitle}>
																	{renderTextWithLatex(question.ques)}
																</Typography>
															)}
														</Box>

														{/* Options */}
														<Grid container spacing={2} sx={{ mt: 1 }}>
															{question.options?.map((opt, idx) => {
																const isSelected = userAnswerIndex === idx;
																let className = "";
																let label = "";

																// Only show user's answer with correct/incorrect indicator
																if (isSelected && hasUserAnswer) {
																	if (isCorrect) {
																		className = "correct-answer";
																		label = "Your Answer (Correct)";
																	} else {
																		className = "wrong";
																		label = "Your Answer (Incorrect)";
																	}
																}

														return (
															<Grid key={idx} size={{ xs: 12, sm: 6 }}>
																<Box sx={{ position: "relative" }}>
																	<OptionCard
																		className={className}
																		sx={{
																			cursor: "default",
																			opacity: isSelected ? 1 : 0.7,
																		}}
																	>
																		<CardContent>
																			{question.optionsType === 'html' ? (
																				<Typography 
																					variant="subtitle1" 
																					align="center"
																					sx={{
																						wordBreak: 'break-word',
																						'& *': {
																							maxWidth: '100%'
																						}
																					}}
																					dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt || '') }}
																				/>
																			) : (
																				<Typography 
																					variant="subtitle1" 
																					align="center"
																					sx={{
																						whiteSpace: 'pre-wrap',
																						wordBreak: 'break-word',
																						'& .katex': {
																							fontSize: '1em'
																						}
																					}}
																				>
																					{renderTextWithLatex(opt)}
																				</Typography>
																			)}
																		</CardContent>
																	</OptionCard>
																	{label && (
																		<Typography
																			variant="caption"
																			sx={{
																				position: "absolute",
																				top: -8,
																				right: 8,
																				px: 1,
																				py: 0.5,
																				borderRadius: 1,
																				backgroundColor: isCorrect ? "success.main" : "error.main",
																				color: "white",
																				fontWeight: 600,
																				fontSize: "0.7rem",
																			}}
																		>
																			{label}
																		</Typography>
																	)}
																</Box>
															</Grid>
														);
													})}
												</Grid>
											</Box>
										);
									})}
										</Box>
									);
								})()}

								{/* Navigation Button */}
								<Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 4 }}>
									<StyledButton
										variant="contained"
										size="medium"
										onClick={() => navigate(-1)}
										sx={{
											px: 3,
											py: 1,
											fontSize: "0.9rem",
											fontWeight: 600,
										}}
									>
										Back to Chapters
									</StyledButton>
								</Box>
							</CardContent>
						</QuestionCard>
					</Box>
				</>
			) : (
				<Box sx={{ display: "flex", gap: 2, mt: 3, position: "relative", width: "100%", overflowX: "hidden" }}>
					{/* Main Content Area */}
					<Box 
						sx={{ 
							flex: 1,
							minWidth: 0, // Prevents flex item from overflowing
							maxWidth: paletteOpen ? `calc(100% - ${paletteWidth + 16}px)` : "100%",
							transition: "max-width 0.3s ease",
							mx: "auto",
							overflowX: "hidden",
						}}
					>
						{/* Single Question Display */}
						{questions.length > 0 && currentQuestionIndex < questions.length && (
						<Box 
							ref={questionRefs.current[currentQuestionIndex]}
							sx={{ mb: 4 }}
						>
							{(() => {
								const question = questions[currentQuestionIndex];
								const questionIndex = currentQuestionIndex;
								const currentAnswer = selectedAnswers[question.id];
								const isMulticorrect = question.type === 'multicorrect';
								
								// Determine if answer is correct (for display purposes)
								let isCorrect = false;
								let isIncorrect = false;
								if (quizResults && currentAnswer !== null && currentAnswer !== undefined) {
									if (isMulticorrect) {
										const userAnswers = Array.isArray(currentAnswer) ? currentAnswer : [currentAnswer];
										const correctAnswers = question.correctAnswer || [];
										const userSorted = [...userAnswers].sort((a, b) => a - b);
										const correctSorted = [...correctAnswers].sort((a, b) => a - b);
										isCorrect = userSorted.length === correctSorted.length &&
											userSorted.every((val, idx) => val === correctSorted[idx]);
										isIncorrect = !isCorrect;
									} else {
										isCorrect = question.correctAnswer?.includes(currentAnswer);
										isIncorrect = !isCorrect;
									}
								}
								
								return (
									<>
										<QuestionCard>
											<CardContent sx={quizStyles.questionCardContent}>
												<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
															Question {questionIndex + 1} of {questions.length}
														</Typography>
														{isMulticorrect ? (
															<Chip
																icon={<CheckBox sx={{ fontSize: "0.875rem" }} />}
																label="Multiple Correct"
																size="small"
																sx={{
																	height: "24px",
																	fontSize: "0.7rem",
																	fontWeight: 600,
																	backgroundColor: (theme) =>
																		theme.palette.mode === "dark" 
																			? "rgba(33, 150, 243, 0.2)" 
																			: "rgba(33, 150, 243, 0.1)",
																	color: "primary.main",
																	border: "1px solid",
																	borderColor: "primary.main",
																	"& .MuiChip-icon": {
																		color: "primary.main",
																	},
																}}
															/>
														) : (
															<Chip
																icon={<RadioButtonChecked sx={{ fontSize: "0.875rem" }} />}
																label="Single Correct"
																size="small"
																sx={{
																	height: "24px",
																	fontSize: "0.7rem",
																	fontWeight: 600,
																	backgroundColor: (theme) =>
																		theme.palette.mode === "dark" 
																			? "rgba(156, 39, 176, 0.2)" 
																			: "rgba(156, 39, 176, 0.1)",
																	color: "secondary.main",
																	border: "1px solid",
																	borderColor: "secondary.main",
																	"& .MuiChip-icon": {
																		color: "secondary.main",
																	},
																}}
															/>
														)}
													</Box>
													{!quizSubmitted && (
														<IconButton
															size="small"
															onClick={() => handleMarkForReview(question.id)}
															sx={{
																color: questionStates[questionIndex]?.markedForReview ? "#9C27B0" : "text.secondary",
															}}
														>
															{questionStates[questionIndex]?.markedForReview ? (
																<Bookmark sx={{ color: "#9C27B0" }} />
															) : (
																<BookmarkBorder />
															)}
														</IconButton>
													)}
												</Box>
												{question.quesType === 'html' ? (
													<Typography 
														variant="h6" 
														sx={quizStyles.questionTitle}
														dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.ques || '') }}
													/>
												) : (
													<Typography variant="h6" sx={quizStyles.questionTitle}>
														{renderTextWithLatex(question.ques)}
													</Typography>
												)}
											</CardContent>
										</QuestionCard>

										<Grid container spacing={3} sx={{ mt: 2 }}>
											{question.options?.map((opt, idx) => {
												const currentAnswer = selectedAnswers[question.id];
												const isMulticorrect = question.type === 'multicorrect';
												const isSelected = isMulticorrect
													? Array.isArray(currentAnswer) && currentAnswer.includes(idx)
													: currentAnswer === idx;
												const isCorrectAnswer = question.correctAnswer?.includes(idx);
												let className = "";
												
												if (quizSubmitted && quizResults) {
													if (isCorrectAnswer) {
														className = "correct-answer";
													} else if (isSelected && !isCorrectAnswer) {
														className = "wrong";
													}
												} else if (isSelected) {
													className = "selected";
												}

												return (
													<Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
														<OptionCard
															selected={isSelected}
															className={className}
															onClick={() => handleAnswerSelect(question.id, idx)}
														>
															<CardContent>
																{question.optionsType === 'html' ? (
																	<Typography 
																		variant="subtitle1" 
																		align="center"
																		sx={{
																			wordBreak: 'break-word',
																			'& *': {
																				maxWidth: '100%'
																			}
																		}}
																		dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt || '') }}
																	/>
																) : (
																	<Typography 
																		variant="subtitle1" 
																		align="center"
																		sx={{
																			whiteSpace: 'pre-wrap',
																			wordBreak: 'break-word',
																			'& .katex': {
																				fontSize: '1em'
																			}
																		}}
																	>
																		{renderTextWithLatex(opt)}
																	</Typography>
																)}
															</CardContent>
														</OptionCard>
													</Grid>
												);
											})}
										</Grid>

										{/* Navigation Buttons */}
										{!quizSubmitted && (
											<Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, mb: 4 }}>
												<StyledButton
													variant="outlined"
													size="large"
													onClick={() => handleQuestionNavigate(Math.max(0, currentQuestionIndex - 1))}
													disabled={currentQuestionIndex === 0}
													sx={{
														px: 4,
														py: 1.5,
														fontSize: "1rem",
														fontWeight: 600,
													}}
												>
													Previous
												</StyledButton>
												
												<StyledButton
													variant="contained"
													size="large"
													onClick={currentQuestionIndex === questions.length - 1 ? handleSubmit : () => handleQuestionNavigate(Math.min(questions.length - 1, currentQuestionIndex + 1))}
													sx={{
														px: 4,
														py: 1.5,
														fontSize: "1rem",
														fontWeight: 600,
													}}
												>
													{currentQuestionIndex === questions.length - 1 ? "Submit" : "Next"}
												</StyledButton>
											</Box>
										)}
									</>
								);
							})()}
						</Box>
						)}
					</Box>

					{/* Right Panel - Question Palette */}
					{questions.length > 0 && !quizSubmitted && (
						<>
							<Drawer
								anchor="right"
								open={paletteOpen}
								variant="persistent"
								sx={{
									width: paletteOpen ? paletteWidth : 0,
									flexShrink: 0,
									overflow: "hidden",
                                    borderRadius:3,
									"& .MuiDrawer-paper": {
										width: paletteWidth,
										boxSizing: "border-box",
										position: "relative",
										height: "auto",
										backgroundColor: (theme) => 
											theme.palette.mode === "dark" ? "#1A1A1A" : "#FAFAFA",
										overflowX: "hidden",
									},
								}}
							>
								<Box sx={{ p: 2, pt: 5, height: "100%", overflowY: "auto", position: "relative" }}>
									{/* Toggle Button - Inside drawer, top right, only when open */}
									{paletteOpen && (
										<IconButton
											onClick={() => setPaletteOpen(false)}
											sx={{
												position: "absolute",
												top: 8,
												right: 8,
												zIndex: 10,
												padding: 0.5,
												minWidth: "32px",
												width: "32px",
												height: "32px",
											}}
										>
											<ChevronRight />
										</IconButton>
									)}
									<QuestionPalette
										currentIndex={currentQuestionIndex}
										questionStates={questionStates}
										onNavigate={handleQuestionNavigate}
										totalQuestions={questions.length}
									/>
								</Box>
							</Drawer>
							
							{/* Toggle Button - When panel is closed, show on right edge */}
							{!paletteOpen && (
								<IconButton
									onClick={() => setPaletteOpen(true)}
									sx={{
										position: "fixed",
										right: "0px",
										top: "50%",
										transform: "translateY(-50%)",
										zIndex: 1300,
										minWidth: "40px",
										width: "40px",
										height: "40px",
										backgroundColor: (theme) => 
											theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF",
										border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
										borderLeft: (theme) => `1px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
										borderRadius: "8px 0 0 8px",
										boxShadow: 3,
										"&:hover": {
											backgroundColor: (theme) => 
												theme.palette.mode === "dark" ? "#2A2A2A" : "#F5F5F5",
										},
									}}
								>
									<ChevronLeft />
								</IconButton>
							)}
						</>
					)}
				</Box>
			)}

			{/* TEMPORARY: Debug helper box - shows current question answer and TrueSkill data */}
			{import.meta.env.DEV && currentQuestion && !quizSubmitted && (
				<>
					{/* Toggle Button - Show only when debug box is closed */}
					{!debugBoxOpen && (
						<IconButton
							onClick={() => setDebugBoxOpen(true)}
							sx={{
								position: "fixed",
								bottom: 16,
								right: 16,
								zIndex: 1401,
								backgroundColor: (theme) =>
									theme.palette.mode === "dark" ? "rgba(26, 26, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
								border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
								boxShadow: 3,
								"&:hover": {
									backgroundColor: (theme) =>
										theme.palette.mode === "dark" ? "rgba(40, 40, 40, 0.95)" : "rgba(245, 245, 245, 0.95)",
								},
							}}
						>
							<BugReport />
						</IconButton>
					)}

					{/* Debug Box - Conditionally rendered */}
					{debugBoxOpen && (
						<Box
							key={`debug-box-${currentQuestionIndex}`}
							sx={{
								position: "fixed",
								bottom: 16,
								right: 16,
								width: 300,
								maxHeight: 400,
								overflowY: "auto",
								backgroundColor: (theme) =>
									theme.palette.mode === "dark" ? "rgba(26, 26, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
								border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#404040" : "#E5E7EB"}`,
								borderRadius: 2,
								p: 2,
								pt: 4, // Add padding top for close button
								boxShadow: 6,
								zIndex: 1400,
							}}
						>
							{/* Close Button - Inside the box, top right */}
							<IconButton
								onClick={() => setDebugBoxOpen(false)}
								sx={{
									position: "absolute",
									top: 8,
									right: 8,
									zIndex: 10,
									padding: 0.5,
									minWidth: "32px",
									width: "32px",
									height: "32px",
								}}
							>
								<Close />
							</IconButton>

							<Typography
								variant="caption"
								sx={{
									fontWeight: "bold",
									color: "warning.main",
									mb: 1,
									display: "block",
								}}
							>
								[TEMPORARY DEV DEBUG]
							</Typography>
							<Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
								Question {currentQuestionIndex + 1}
							</Typography>
							
							{/* Correct Answer */}
							<Box sx={{ mb: 1.5 }}>
								<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
									Correct Answer:
								</Typography>
								<Typography variant="body2" sx={{ fontWeight: "bold", color: "success.main" }}>
									{currentQuestion.correctAnswer
										? Array.isArray(currentQuestion.correctAnswer)
											? currentQuestion.correctAnswer.join(", ")
											: currentQuestion.correctAnswer
										: "N/A"}
								</Typography>
							</Box>

							{/* User TrueSkill */}
							<Box sx={{ mb: 1.5 }}>
								<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
									User TrueSkill:
								</Typography>
								{currentQuestion.trueskill ? (
									<>
										<Typography variant="body2">
											μ: {currentQuestion.trueskill.mu?.toFixed(2) || "N/A"}
										</Typography>
										<Typography variant="body2">
											σ: {currentQuestion.trueskill.sigma?.toFixed(2) || "N/A"}
										</Typography>
									</>
								) : (
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Not available
									</Typography>
								)}
							</Box>

							{/* Question TrueSkill */}
							<Box sx={{ mb: 1 }}>
								<Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
									Question TrueSkill:
								</Typography>
								{currentQuestion.questionTrueskill ? (
									<>
										<Typography variant="body2">
											μ: {currentQuestion.questionTrueskill.mu?.toFixed(2) || "N/A"}
										</Typography>
										<Typography variant="body2">
											σ: {currentQuestion.questionTrueskill.sigma?.toFixed(2) || "N/A"}
										</Typography>
									</>
								) : (
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Not available
									</Typography>
								)}
							</Box>
						</Box>
					)}
				</>
			)}
		</Box>
	);
};

export default Quiz;

