import type { SupabaseClient } from '@supabase/supabase-js';
import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { DEFAULT_TEMPLATES, extractVariables } from './messageTemplateDefaults';

interface MessageTemplateRow {
  id: string;
  type: string;
  content: string;
  variables: { name: string }[];
  synced_at: string;
}

function toMessageTemplate(row: MessageTemplateRow): MessageTemplate {
  return {
    id: row.id,
    type: new MessageTemplateType(row.type),
    content: row.content,
    variables: row.variables,
  };
}

export class SupabaseMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    const { data, error } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('type', type.value)
      .maybeSingle();

    if (error) {
      throw new Error(`findByType failed: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return toMessageTemplate(data as MessageTemplateRow);
  }

  async findAll(): Promise<MessageTemplate[]> {
    const { data, error } = await this.supabase.from('message_templates').select('*');

    if (error) {
      throw new Error(`findAll failed: ${error.message}`);
    }

    return (data as MessageTemplateRow[]).map(toMessageTemplate);
  }

  async save(template: MessageTemplate): Promise<void> {
    const row: MessageTemplateRow = {
      id: template.id,
      type: template.type.value,
      content: template.content,
      variables: template.variables,
      synced_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('message_templates')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      throw new Error(`save failed: ${error.message}`);
    }
  }

  async saveAll(templates: MessageTemplate[]): Promise<void> {
    if (templates.length === 0) {
      return;
    }

    const rows: MessageTemplateRow[] = templates.map((t) => ({
      id: t.id,
      type: t.type.value,
      content: t.content,
      variables: t.variables,
      synced_at: new Date().toISOString(),
    }));

    const { error } = await this.supabase
      .from('message_templates')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      throw new Error(`saveAll failed: ${error.message}`);
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
