import { supabase } from '@/lib/supabase-browser'
import { Label, LabelGroup, LabelStats } from '@/types/label'

interface LabelGroupMapping {
    label: Label
}

interface LabelGroupResponse extends Omit<LabelGroup, 'labels'> {
    labels: LabelGroupMapping[]
}

export class LabelService {
    // Get all labels
    static async getLabels(): Promise<Label[]> {
        const { data, error } = await supabase
            .from('labels')
            .select(
                `
        *,
        conversation_labels(count)
      `
            )
            .eq('is_active', true)
            .order('name')

        if (error) throw error

        return (data || []).map((label) => ({
            ...label,
            usage_count: label.conversation_labels?.[0]?.count || 0,
        }))
    }

    // Get label groups with their labels
    static async getLabelGroups(): Promise<LabelGroup[]> {
        const { data, error } = await supabase
            .from('label_groups')
            .select(
                `
        *,
        labels:label_group_mappings(
          label:labels(*)
        )
      `
            )
            .eq('is_active', true)
            .order('name')

        if (error) throw error

        return ((data as LabelGroupResponse[]) || []).map((group) => ({
            ...group,
            labels: group.labels.map((l) => l.label),
        }))
    }

    // Get label statistics
    static async getLabelStats(): Promise<LabelStats> {
        const { data: statsData, error: statsError } = await supabase.rpc(
            'get_label_statistics'
        )

        if (statsError) throw statsError

        return statsData
    }

    // Create a new label
    static async createLabel(
        label: Omit<Label, 'id' | 'created_at' | 'usage_count'>
    ): Promise<Label> {
        const { data, error } = await supabase
            .from('labels')
            .insert([label])
            .select()
            .single()

        if (error) throw error
        return data
    }

    // Update a label
    static async updateLabel(
        id: string,
        updates: Partial<Label>
    ): Promise<void> {
        const { error } = await supabase
            .from('labels')
            .update(updates)
            .eq('id', id)

        if (error) throw error
    }

    // Delete a label (soft delete)
    static async deleteLabel(id: string): Promise<void> {
        const { error } = await supabase
            .from('labels')
            .update({ is_active: false })
            .eq('id', id)

        if (error) throw error
    }

    // Create a label group
    static async createLabelGroup(
        group: Omit<LabelGroup, 'id' | 'created_at' | 'labels'>
    ): Promise<LabelGroup> {
        const { data, error } = await supabase
            .from('label_groups')
            .insert([group])
            .select()
            .single()

        if (error) throw error
        return { ...data, labels: [] }
    }

    // Add labels to group
    static async addLabelsToGroup(
        groupId: string,
        labelIds: string[]
    ): Promise<void> {
        const mappings = labelIds.map((labelId) => ({
            group_id: groupId,
            label_id: labelId,
        }))

        const { error } = await supabase
            .from('label_group_mappings')
            .insert(mappings)

        if (error) throw error
    }

    // Remove labels from group
    static async removeLabelsFromGroup(
        groupId: string,
        labelIds: string[]
    ): Promise<void> {
        const { error } = await supabase
            .from('label_group_mappings')
            .delete()
            .eq('group_id', groupId)
            .in('label_id', labelIds)

        if (error) throw error
    }

    // Delete a label group (soft delete)
    static async deleteLabelGroup(id: string): Promise<void> {
        const { error } = await supabase
            .from('label_groups')
            .update({ is_active: false })
            .eq('id', id)

        if (error) throw error
    }
}
