import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env';
import { prisma } from '../db/prisma';

export interface EmailDocument {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail?: string;
  senderName?: string;
  status: string;
  scheduledForTime: string;
  sentAt?: string;
  etherealPreviewUrl?: string;
  createdAt: string;
  batchId?: string;
  userId?: string | null;
}

let esClient: Client | null = null;
let isEsConnected = false;
const INDEX_NAME = 'emails';

export async function initElasticsearch(): Promise<boolean> {
  try {
    esClient = new Client({
      node: config.elasticsearchNode,
      requestTimeout: 2000,
    });

    const pingRes = await esClient.ping();
    if (pingRes) {
      console.log(`[Elasticsearch] Connected successfully to node: ${config.elasticsearchNode}`);
      isEsConnected = true;

      const indexExists = await esClient.indices.exists({ index: INDEX_NAME });
      if (!indexExists) {
        await esClient.indices.create({
          index: INDEX_NAME,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              senderEmail: { type: 'keyword' },
              senderName: { type: 'text' },
              status: { type: 'keyword' },
              scheduledForTime: { type: 'date' },
              sentAt: { type: 'date' },
              etherealPreviewUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
              userId: { type: 'keyword' },
            },
          },
        });
      }
      return true;
    }
  } catch (err) {
    console.warn(`[Elasticsearch] Fallback to DB search mode active.`);
    isEsConnected = false;
  }
  return false;
}

export async function indexEmail(emailDoc: EmailDocument): Promise<void> {
  if (isEsConnected && esClient) {
    try {
      await esClient.index({
        index: INDEX_NAME,
        id: emailDoc.id,
        document: emailDoc as any,
        refresh: 'wait_for',
      });
    } catch (err) {
      console.error(`[Elasticsearch] Error indexing email ${emailDoc.id}:`, err);
    }
  }
}

export async function searchEmails(queryStr: string, statusFilter?: string): Promise<{ source: 'elasticsearch' | 'database'; results: any[] }> {
  if (isEsConnected && esClient) {
    try {
      const mustClauses: any[] = [];
      if (statusFilter && statusFilter !== 'ALL') {
        mustClauses.push({ term: { status: statusFilter } });
      }

      if (queryStr && queryStr.trim().length > 0) {
        mustClauses.push({
          multi_match: {
            query: queryStr,
            fields: ['recipientEmail^3', 'subject^2', 'body', 'senderName', 'senderEmail'],
            fuzziness: 'AUTO',
          },
        });
      }

      const response = await esClient.search({
        index: INDEX_NAME,
        query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
        sort: [{ createdAt: { order: 'desc' } }],
      });

      const hits = response.hits.hits.map((hit) => hit._source);
      return { source: 'elasticsearch', results: hits };
    } catch (err) {
      console.error('[Elasticsearch] Query failed, falling back to DB search:', err);
    }
  }

  // Fallback to Prisma DB search with full relational include
  const whereCondition: any = {};
  if (statusFilter && statusFilter !== 'ALL') {
    if (statusFilter === 'SCHEDULED') {
      whereCondition.status = { in: ['SCHEDULED', 'RESCHEDULED_RATE_LIMIT', 'PROCESSING'] };
    } else if (statusFilter === 'SENT') {
      whereCondition.status = { in: ['SENT', 'FAILED'] };
    } else {
      whereCondition.status = statusFilter;
    }
  }

  const cleanQ = queryStr ? queryStr.trim() : '';
  if (cleanQ.length > 0) {
    whereCondition.OR = [
      { recipientEmail: { contains: cleanQ } },
      { subject: { contains: cleanQ } },
      { body: { contains: cleanQ } },
    ];
  }

  const dbResults = await prisma.scheduledEmail.findMany({
    where: whereCondition,
    include: { sender: true, batch: true },
    orderBy: { createdAt: 'desc' },
  });

  return { source: 'database', results: dbResults };
}
