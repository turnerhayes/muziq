require("dotenv").config();
const pathConfig = require("../../server/lib/config/paths");

module.exports = exports = {
  "@app": pathConfig.APP_PATH,
  "@shared-lib": pathConfig.SHARED_LIB_PATH,
};
