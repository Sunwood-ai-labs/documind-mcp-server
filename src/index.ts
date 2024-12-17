#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ReadmeService } from './services/readme.service.js';

class DocuMindServer {
  private server: Server;
  private readmeService: ReadmeService;

  constructor() {
    this.server = new Server(
      {
        name: 'source-sage-documind-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.readmeService = new ReadmeService();
    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'evaluate_readme',
          description: 'リポジトリ内の全てのREADMEファイルの構成を評価し、改善点を提案します',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'プロジェクトのルートディレクトリパス',
              },
            },
            required: ['projectPath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'evaluate_readme') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const { projectPath } = request.params.arguments as { projectPath: string };
      
      try {
        const evaluations = await this.readmeService.evaluateAllReadmes(projectPath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(evaluations, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `評価中にエラーが発生しました: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DocuMind MCP server running on stdio');
  }
}

const server = new DocuMindServer();
server.run().catch(console.error);