const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

try {
  const notificationLogo = getPngDimensions('E:/visionFrontend/frontend/SpeakingCoach/assets/images/notification_vision_logo.png');
  console.log('notification_vision_logo.png:', notificationLogo);
  
  // logo2.png is also a PNG (based on list_directory)
  const logo2 = getPngDimensions('E:/visionFrontend/frontend/SpeakingCoach/assets/images/logo2.png');
  console.log('logo2.png:', logo2);
} catch (e) {
  console.error(e);
}
