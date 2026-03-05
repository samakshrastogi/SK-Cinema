export const generateMetadataService = async (filename: string) => {
    const cleanName = filename.replace(/\.[^/.]+$/, "");

    return {
        title: `🔥 ${cleanName} - Must Watch`,
        description: `This video titled "${cleanName}" contains engaging content crafted for viewers.`,
    };
};