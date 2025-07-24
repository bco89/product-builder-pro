import { json } from "@remix-run/node";
import { authenticateAdmin } from "../services/auth.server";
import { getRecentExtractedData, getRecentLLMPrompts } from "../services/prompt-logger-db.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { 
  retryWithBackoff, 
  parseGraphQLResponse, 
  errorResponse 
} from "../services/errorHandler.server";
import type { GraphQLErrorResponse } from "../types/errors";

export const loader = async ({
  const requestId = Logger.generateRequestId(); request }: LoaderFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all';
  const limit = parseInt(url.searchParams.get('limit') || '10');
  
  try {
    if (type === 'extracted') {
      const extractedLogs = await getRecentExtractedData(session.shop, limit);
      return json({ extractedLogs });
    } else if (type === 'prompts') {
      const promptLogs = await getRecentLLMPrompts(session.shop, limit);
      return json({ promptLogs });
    } else {
      const [extractedLogs, promptLogs] = await Promise.all([
        getRecentExtractedData(session.shop, limit),
        getRecentLLMPrompts(session.shop, limit)
      ]);
      return json({ extractedLogs, promptLogs });
    }
  } catch (error) {
    return errorResponse(error, context);
  }
};