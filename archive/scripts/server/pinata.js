import { PinataSDK } from "pinata-web3";

// Ensure you add these to your server/.env file (we will use Pinata JWT for the modern pinata-web3 SDK)
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL
});

export const uploadToIPFS = async (fileBuffer, fileName) => {
  try {
    // With pinata-web3, we can upload using a File object or Buffer
    const blob = new Blob([fileBuffer]);
    const file = new File([blob], fileName, { type: "application/octet-stream" });
    
    console.log(`Uploading ${fileName} to IPFS via Pinata...`);
    const upload = await pinata.upload.file(file);
    console.log(`Successfully uploaded! IPFS Hash (CID): ${upload.IpfsHash}`);
    
    return upload.IpfsHash; 
  } catch (error) {
    console.error("Error uploading to Pinata/IPFS:", error);
    throw error;
  }
};
