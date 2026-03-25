import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { SheetsClient } from '../../external/google/SheetsClient';
import { DEFAULT_TEMPLATES, extractVariables } from './messageTemplateDefaults';

const COL = {
  type: 0,
  id: 1,
  content: 2,
} as const;

export class SpreadsheetMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  constructor(private readonly sheetsClient: SheetsClient) {}

  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    const rows = await this.sheetsClient.readRows();
    const row = rows.find((r) => (r[COL.type] ?? '').trim() === type.value);

    if (!row || !(row[COL.content] ?? '').trim()) {
      return null;
    }

    const content = row[COL.content]!;
    return {
      id: (row[COL.id] ?? '').trim() || `custom-${type.value}`,
      type,
      content,
      variables: extractVariables(content),
    };
  }

  async save(template: MessageTemplate): Promise<void> {
    const rows = await this.sheetsClient.readRows();
    const serialized = [template.type.value, template.id, template.content];
    const index = rows.findIndex((r) => (r[COL.type] ?? '').trim() === template.type.value);

    if (index >= 0) {
      rows[index] = serialized;
    } else {
      rows.push(serialized);
    }

    await this.sheetsClient.clearRows();
    await this.sheetsClient.writeRows(rows);
  }

  async findAll(): Promise<MessageTemplate[]> {
    const rows = await this.sheetsClient.readRows();
    return rows
      .filter((r) => (r[COL.type] ?? '').trim().length > 0)
      .map((row) => {
        const typeValue = (row[COL.type] ?? '').trim();
        const content = (row[COL.content] ?? '').trim();
        const type = new MessageTemplateType(typeValue);
        return {
          id: (row[COL.id] ?? '').trim() || `custom-${typeValue}`,
          type,
          content,
          variables: extractVariables(content),
        };
      });
  }

  async saveAll(templates: MessageTemplate[]): Promise<void> {
    const rows = templates.map((t) => [t.type.value, t.id, t.content]);
    await this.sheetsClient.clearRows();
    if (rows.length > 0) {
      await this.sheetsClient.writeRows(rows);
    }
  }

  async resetToDefault(type: MessageTemplateType): Promise<MessageTemplate> {
    const base = DEFAULT_TEMPLATES[type.value];
    const defaultTemplate: MessageTemplate = {
      id: base.id,
      type,
      content: base.content,
      variables: extractVariables(base.content),
    };
    await this.save(defaultTemplate);
    return defaultTemplate;
  }
}
