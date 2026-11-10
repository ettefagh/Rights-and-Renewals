import * as mod from 'zod';
const ObjProto = Object.getPrototypeOf(mod.object({}));
if (ObjProto && !ObjProto.loose) {
  ObjProto.loose = ObjProto.passthrough;
}
export * from 'zod';
export const z = mod;
export default mod;
