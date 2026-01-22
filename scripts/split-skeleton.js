const sharp = require('sharp');
const path = require('path');

async function splitImage() {
  const inputPath = path.join(__dirname, '../public/images/skeleton_image.png');
  const frontPath = path.join(__dirname, '../public/images/skeleton_front.png');
  const sidePath = path.join(__dirname, '../public/images/skeleton_side.png');

  try {
    const metadata = await sharp(inputPath).metadata();
    console.log(`Original image: ${metadata.width}x${metadata.height}`);

    const halfWidth = Math.floor(metadata.width / 2);

    // 정면 (왼쪽 절반)
    await sharp(inputPath)
      .extract({ left: 0, top: 0, width: halfWidth, height: metadata.height })
      .toFile(frontPath);
    console.log(`Created: skeleton_front.png (${halfWidth}x${metadata.height})`);

    // 측면 (오른쪽 절반)
    await sharp(inputPath)
      .extract({ left: halfWidth, top: 0, width: halfWidth, height: metadata.height })
      .toFile(sidePath);
    console.log(`Created: skeleton_side.png (${halfWidth}x${metadata.height})`);

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

splitImage();
