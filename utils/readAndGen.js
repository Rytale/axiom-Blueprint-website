/* ========================================
   Axiom Blueprint photo extractor   Ver 1.0.2
   ----------------------------------------
   Pulls the photo from .bp files upon upload.


   ======================================== */
                
// TODO: Add more options, parameters and validations.
//
//
//

// ========= Personal Notes =========
/*
   - Remember to optimize this later
*/

// ========= Temporary Debugging =========
/*
   For debugging purposes:
   - Uncomment the following line to log some values
   console.log(someValue);
*/

// ========= Project Ideas =========
/*
   Project ideas or potential improvements:
   - 
   - 
*/


// Import required modules
const sharp = require('sharp'); // Library for image processing
const fs = require('fs').promises; // Library for working with the file system

// Constants
const MAGIC = 0xAE5BB36; // A predefined magic number for identification
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // Maximum size in bytes (e.g., 5MB)
const NEW_THUMBNAIL_SIZE = 96; // New size in pixels for both width and height

// Function to read an image file, generate a thumbnail, and save it
async function readAndGenerateThumbnail(inputFilePath, outputFilePath) {
    // Read the entire content of the input file
    const data = await fs.readFile(inputFilePath);

    // Read the magic number from the data
    const magic = data.readInt32BE(0);
    if (magic !== MAGIC) {
        throw new Error('Invalid blueprint magic number');
    }

    // Read the length of the header
    const headerLength = data.readInt32BE(4);

    // Calculate the offset of the thumbnail in the data
    const thumbnailOffset = 8 + headerLength;

    // Read the length of the thumbnail data
    const thumbnailLength = data.readInt32BE(thumbnailOffset);

    // Check if the thumbnail size exceeds the maximum limit
    if (thumbnailLength > MAX_THUMBNAIL_SIZE) {
        throw new Error('Thumbnail size exceeds maximum limit');
    }

    // Extract the thumbnail data from the content
    const thumbnailBytes = data.slice(thumbnailOffset + 4, thumbnailOffset + 4 + thumbnailLength);

    // Process the thumbnail using the sharp library
    const image = sharp(thumbnailBytes)
        .flip() // Flip the image vertically
        .resize(NEW_THUMBNAIL_SIZE, NEW_THUMBNAIL_SIZE); // Resize the image

    // Retrieve metadata about the image
    const metadata = await image.metadata();
    if (metadata.format !== 'png') {
        throw new Error('Invalid thumbnail format');
    }

    // Save the processed thumbnail to the output file path
    return image.toFile(outputFilePath);
}

// Export the function for use in other modules
module.exports = {
    readAndGenerateThumbnail
};
