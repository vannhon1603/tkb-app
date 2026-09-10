export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: "user" | string;
  avatar?: string;
  picture?: string;
  sub?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: string | number;
}

export interface TabGroup {
  label: string;
  tabs: MenuItem[];
}

export interface SampleItem {
  id: string;
  code: string;
  name: string;
  category: string;
  status: "active" | "inactive" | "pending";
  priority: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
}

export interface SystemStat {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  iconName: string;
}
