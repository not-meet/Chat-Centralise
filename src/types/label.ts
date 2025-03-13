export interface Label {
    id: string
    name: string
    color: string
    description?: string
    created_at: string
    created_by: string
    usage_count: number
    is_active: boolean
}

export interface LabelGroup {
    id: string
    name: string
    description?: string
    labels: Label[]
    created_at: string
    created_by: string
    is_active: boolean
}

export interface LabelStats {
    total_labels: number
    total_groups: number
    most_used_labels: {
        label_id: string
        label_name: string
        usage_count: number
    }[]
    recent_labels: {
        label_id: string
        label_name: string
        last_used: string
    }[]
}
