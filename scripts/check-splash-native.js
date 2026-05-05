const fs = require('fs');

function getPngDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  } catch (e) {
    return null;
  }
}

const paths = [
  'E:/visionFrontend/frontend/SpeakingCoach/android/app/src/main/res/drawable/splashscreen_logo.png',
  'E:/visionFrontend/frontend/SpeakingCoach/android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png',
  'E:/visionFrontend/frontend/SpeakingCoach/assets/images/notification_vision_logo.png',
  'E:/visionFrontend/frontend/SpeakingCoach/assets/images/logo2.png'
];

paths.forEach(p => {
  console.log(`${p}:`, getPngDimensions(p));
});
