import { statsClient } from './src/lib/xray';
import * as grpc from '@grpc/grpc-js';

statsClient.queryStats({
  pattern: "user>>>",
  reset: false
}, (err, res) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(res, null, 2));
});
