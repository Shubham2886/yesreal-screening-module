require('dotenv').config();
const app = require('./app');
const { scheduleReportReprocessor } = require('./cron/reportProcessor');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`yesreal screening backend listening on port ${PORT}`);
  scheduleReportReprocessor();
});
