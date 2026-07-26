const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const protobuf = require('protobufjs');
const path = require('path');

async function main() {
  const root = protobuf.loadSync([
    path.join(__dirname, 'src/proto/app/proxyman/command/command.proto'),
    path.join(__dirname, 'src/proto/proxy/vless/account.proto'),
    path.join(__dirname, 'src/proto/app/stats/command/command.proto'),
  ]);

  const loadOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [path.join(__dirname, 'src/proto')]
  };

  const proxymanDef = protoLoader.loadSync(
    path.join(__dirname, 'src/proto/app/proxyman/command/command.proto'),
    loadOptions
  );
  
  const xrayProxyman = grpc.loadPackageDefinition(proxymanDef).xray.app.proxyman.command;
  const handlerClient = new xrayProxyman.HandlerService('127.0.0.1:7999', grpc.credentials.createInsecure());

  const Account = root.lookupType("xray.proxy.vless.Account");
  const accountMsg = Account.create({ 
    id: "b831381d-6324-4d53-ad4f-8cda48b30811", 
    flow: "xtls-rprx-vision", 
    encryption: "none" 
  });
  const accountBytes = Account.encode(accountMsg).finish();

  const AddUserOperation = root.lookupType("xray.app.proxyman.command.AddUserOperation");
  const opMsg = AddUserOperation.create({
    user: {
      email: "test@nada.mu",
      level: 0,
      account: {
        type: "xray.proxy.vless.Account", // Actually typically requires type.googleapis.com/... but maybe Xray accepts just the type
        value: accountBytes
      }
    }
  });
  const opBytes = AddUserOperation.encode(opMsg).finish();

  console.log("Calling alterInbound...");
  handlerClient.alterInbound({
    tag: "vless-in",
    operation: {
      type: "xray.app.proxyman.command.AddUserOperation",
      value: opBytes
    }
  }, (err, res) => {
    if (err) {
      console.error("Error:", err);
    } else {
      console.log("Success:", res);
    }
  });
}

main().catch(console.error);
