import { handlePublicMcp } from '../../src/mcp/publicMcp';

export const onRequest = ({ request }: { request: Request }) => handlePublicMcp(request);
