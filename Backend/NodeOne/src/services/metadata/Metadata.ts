import { IMetadata, Metadata } from "../../models/Metadata";

namespace MetadataService {
	export const initializeNewMetadata = async ({
		metadata,
	}: {
		metadata: Partial<IMetadata>;
	}): Promise<IMetadata> => {
		const newMetadata = new Metadata({
			...metadata,
		});
		await newMetadata.save();
		return newMetadata;
	};

	export const getMetadataById = async (metadataId: string): Promise<IMetadata | null> => {
		return Metadata.findOne({ metadataId }).exec();
	};
}

export default MetadataService;
