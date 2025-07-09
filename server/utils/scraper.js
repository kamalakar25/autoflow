
const robotsParser = require('robots-parser');
const axios = require('axios');

exports.checkRobotsTxt = async (url) => {
  try {
    const robotsUrl = new URL('/robots.txt', url).href;
    const { data } = await axios.get(robotsUrl);
    const robots = robotsParser(robotsUrl, data);
    return robots.isAllowed(url, 'MyScraperBot');
  } catch (error) {
    console.warn('Could not fetch robots.txt:', error.message);
    return true;
  }
};
