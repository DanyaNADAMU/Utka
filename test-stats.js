const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const STATS_PROTO = path.join(__dirname, 'src/proto/app/stats/command/command.proto');
const loadOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.join(__dirname, 'src/proto')]
};

const statsDef = protoLoader.loadSync(STATS_PROTO, loadOptions);
const xrayStats = grpc.loadPackageDefinition(statsDef).xray.app.stats.command;

const statsClient = new xrayStats.StatsService('unix:///app/xray/api.sock', grpc.credentials.createInsecure());

statsClient.queryStats({ pattern: "user>>>", reset: false }, (err, res) => {
  if (err) {
    console.error("Error:", err);
  } else {
    console.log("Stats:", JSON.stringify(res, null, 2));
  }
});
