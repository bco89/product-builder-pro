import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  BlockStack,
  Button,
  InlineStack,
  Badge,
  Modal,
  Box,
  Scrollable,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticateAdmin } from "../services/auth.server";
import { getRecentExtractedData, getRecentLLMPrompts } from "../services/ai";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useState, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  
  try {
    const [extractedLogs, promptLogs] = await Promise.all([
      getRecentExtractedData(session.shop, 20),
      getRecentLLMPrompts(session.shop, 20)
    ]);
    
    return json({ 
      extractedLogs,
      promptLogs,
      shop: session.shop
    });
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return json({ 
      extractedLogs: [],
      promptLogs: [],
      shop: session.shop,
      error: 'Failed to fetch logs'
    });
  }
};

export default function PromptLogs() {
  const { extractedLogs, promptLogs, shop } = useLoaderData<typeof loader>();
  const [selectedExtracted, setSelectedExtracted] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);

  const handleViewExtracted = useCallback((log: any) => {
    setSelectedExtracted(log);
  }, []);

  const handleViewPrompt = useCallback((log: any) => {
    setSelectedPrompt(log);
  }, []);

  // Format extracted data logs for DataTable
  const extractedRows = extractedLogs.map((log: any) => [
    log.productTitle,
    new Date(log.createdAt).toLocaleString(),
    log.extractedData?.keyFeatures?.length || 0,
    log.extractedData?.benefits?.length || 0,
    <Button onClick={() => handleViewExtracted(log)} variant="plain">View</Button>
  ]);

  // Format prompt logs for DataTable
  const promptRows = promptLogs.map((log: any) => [
    log.productTitle,
    new Date(log.createdAt).toLocaleString(),
    `${log.promptLength?.total || 0} chars`,
    log.scrapedDataSection ? <Badge>Yes</Badge> : <Badge tone="subdued">No</Badge>,
    <Button onClick={() => handleViewPrompt(log)} variant="plain">View</Button>
  ]);

  return (
    <Page>
      <TitleBar title="Prompt & Extraction Logs" />
      
      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Extracted Data Logs</Text>
                <Text variant="bodyMd" tone="subdued">
                  Recent data extracted from URLs using Firecrawl
                </Text>
                
                {extractedLogs.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text']}
                    headings={['Product', 'Date', 'Features', 'Benefits', 'Actions']}
                    rows={extractedRows}
                  />
                ) : (
                  <Text tone="subdued">No extracted data logs found</Text>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">LLM Prompt Logs</Text>
                <Text variant="bodyMd" tone="subdued">
                  Recent prompts sent to the AI for description generation
                </Text>
                
                {promptLogs.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={['Product', 'Date', 'Prompt Size', 'Has Scraped Data', 'Actions']}
                    rows={promptRows}
                  />
                ) : (
                  <Text tone="subdued">No prompt logs found</Text>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Modal for viewing extracted data */}
      <Modal
        open={!!selectedExtracted}
        onClose={() => setSelectedExtracted(null)}
        title={`Extracted Data: ${selectedExtracted?.productTitle || ''}`}
        primaryAction={{
          content: 'Close',
          onAction: () => setSelectedExtracted(null),
        }}
        large
      >
        <Modal.Section>
          <Box maxHeight="500px">
            <Scrollable>
              <BlockStack gap="400">
                <Text variant="headingSm" as="h3">Product Information</Text>
                <Box paddingBlockEnd="400">
                  <BlockStack gap="200">
                    <Text><strong>Title:</strong> {selectedExtracted?.extractedData?.productTitle || 'N/A'}</Text>
                    <Text><strong>Brand:</strong> {selectedExtracted?.extractedData?.brandVendor || 'N/A'}</Text>
                    <Text><strong>Category:</strong> {selectedExtracted?.extractedData?.productCategory || 'N/A'}</Text>
                  </BlockStack>
                </Box>

                {selectedExtracted?.extractedData?.keyFeatures?.length > 0 && (
                  <>
                    <Text variant="headingSm" as="h3">Key Features</Text>
                    <Box paddingBlockEnd="400">
                      <ul>
                        {selectedExtracted.extractedData.keyFeatures.map((feature: string, i: number) => (
                          <li key={i}>{feature}</li>
                        ))}
                      </ul>
                    </Box>
                  </>
                )}

                {selectedExtracted?.extractedData?.detailedDescription && (
                  <>
                    <Text variant="headingSm" as="h3">Description</Text>
                    <Box paddingBlockEnd="400">
                      <Text>{selectedExtracted.extractedData.detailedDescription}</Text>
                    </Box>
                  </>
                )}

                <Text variant="headingSm" as="h3">Raw JSON</Text>
                <Box paddingInline="400" paddingBlock="400" background="bg-surface-secondary" borderRadius="200">
                  <pre style={{ overflow: 'auto', fontSize: '12px' }}>
                    {JSON.stringify(selectedExtracted?.extractedData, null, 2)}
                  </pre>
                </Box>
              </BlockStack>
            </Scrollable>
          </Box>
        </Modal.Section>
      </Modal>

      {/* Modal for viewing prompts */}
      <Modal
        open={!!selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
        title={`LLM Prompt: ${selectedPrompt?.productTitle || ''}`}
        primaryAction={{
          content: 'Close',
          onAction: () => setSelectedPrompt(null),
        }}
        large
      >
        <Modal.Section>
          <Box maxHeight="500px">
            <Scrollable>
              <BlockStack gap="400">
                <InlineStack gap="400">
                  <Badge>System: {selectedPrompt?.systemPrompt?.length || 0} chars</Badge>
                  <Badge>User: {selectedPrompt?.userPrompt?.length || 0} chars</Badge>
                  <Badge>Total: {selectedPrompt?.promptLength?.total || 0} chars</Badge>
                </InlineStack>

                <Text variant="headingSm" as="h3">System Prompt</Text>
                <Box paddingInline="400" paddingBlock="400" background="bg-surface-secondary" borderRadius="200">
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {selectedPrompt?.systemPrompt}
                  </pre>
                </Box>

                <Text variant="headingSm" as="h3">User Prompt</Text>
                <Box paddingInline="400" paddingBlock="400" background="bg-surface-secondary" borderRadius="200">
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {selectedPrompt?.userPrompt}
                  </pre>
                </Box>

                {selectedPrompt?.scrapedDataSection && (
                  <>
                    <Text variant="headingSm" as="h3">Scraped Data Section</Text>
                    <Box paddingInline="400" paddingBlock="400" background="bg-surface-secondary" borderRadius="200">
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                        {selectedPrompt.scrapedDataSection}
                      </pre>
                    </Box>
                  </>
                )}
              </BlockStack>
            </Scrollable>
          </Box>
        </Modal.Section>
      </Modal>
    </Page>
  );
}