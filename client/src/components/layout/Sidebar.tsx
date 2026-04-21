import { useQuery } from "@tanstack/react-query";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe2,
  House,
  LayoutDashboard,
  ListTodo,
  Route,
  ScanSearch,
  Settings2,
  SquarePen,
  Tags,
  UsersRound,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { listKnowledgeDocuments } from "@/api/knowledge";
import { queryKeys } from "@/api/queryKeys";
import { listTasks } from "@/api/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Sáng tác",
    items: [
      { to: "/", label: "Trang chủ", icon: House },
      { to: "/novels", label: "Danh sách tiểu thuyết", icon: BookOpenText },
      { to: "/creative-hub", label: "Trung tâm sáng tác", icon: LayoutDashboard },
      { to: "/book-analysis", label: "Phân tích sách", icon: ScanSearch },
      { to: "/tasks", label: "Trung tâm tác vụ", icon: ListTodo },
    ],
  },
  {
    title: "Tài sản",
    items: [
      { to: "/genres", label: "Kho thể loại", icon: Tags },
      { to: "/story-modes", label: "Kho nhịp triển khai", icon: Workflow },
      { to: "/titles", label: "Xưởng tiêu đề", icon: SquarePen },
      { to: "/knowledge", label: "Tri thức", icon: Database },
      { to: "/worlds", label: "Thế giới quan", icon: Globe2 },
      { to: "/style-engine", label: "Bộ máy phong cách viết", icon: WandSparkles },
      { to: "/base-characters", label: "Kho nhân vật nền", icon: UsersRound },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { to: "/settings/model-routes", label: "Điều phối mô hình", icon: Route },
      { to: "/settings", label: "Cài đặt hệ thống", icon: Settings2 },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.list("sidebar"),
    queryFn: () => listTasks({ limit: 80 }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data?.items ?? [];
      return rows.some((item) => item.status === "queued" || item.status === "running") ? 4000 : false;
    },
  });

  const knowledgeQuery = useQuery({
    queryKey: queryKeys.knowledge.documents("sidebar"),
    queryFn: () => listKnowledgeDocuments(),
    staleTime: 30_000,
  });

  const tasks = taskQuery.data?.data?.items ?? [];
  const runningTaskCount = tasks.filter((item) => item.status === "running").length;
  const failedTaskCount = tasks.filter((item) => item.status === "failed").length;
  const knowledgeDocuments = knowledgeQuery.data?.data ?? [];
  const failedIndexCount = knowledgeDocuments.filter((item) => item.latestIndexStatus === "failed").length;

  const renderBadge = (to: string) => {
    if (to === "/tasks") {
      if (runningTaskCount <= 0 && failedTaskCount <= 0) {
        return null;
      }
      return (
        <div className={cn("flex items-center gap-1", collapsed ? "absolute right-1 top-1" : "ml-auto")}>
          {runningTaskCount > 0 ? (
            <Badge
              variant="secondary"
              className={cn("h-5 px-1.5 text-[10px]", collapsed && "h-4 min-w-4 px-1 text-[9px]")}
            >
              {collapsed ? runningTaskCount : `R${runningTaskCount}`}
            </Badge>
          ) : null}
          {failedTaskCount > 0 ? (
            <Badge
              variant="destructive"
              className={cn("h-5 px-1.5 text-[10px]", collapsed && "h-4 min-w-4 px-1 text-[9px]")}
            >
              {collapsed ? failedTaskCount : `F${failedTaskCount}`}
            </Badge>
          ) : null}
        </div>
      );
    }

    if (to === "/knowledge" && failedIndexCount > 0) {
      return (
        <Badge
          variant="destructive"
          className={cn(
            "h-5 px-1.5 text-[10px]",
            collapsed ? "absolute right-1 top-1 h-4 min-w-4 px-1 text-[9px]" : "ml-auto",
          )}
        >
          {collapsed ? failedIndexCount : `F${failedIndexCount}`}
        </Badge>
      );
    }

    return null;
  };

  return (
    <aside
      className={cn(
        "border-r bg-muted/20 p-3 transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("mb-4 flex items-center", collapsed ? "justify-center" : "justify-end")}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onToggle}
          aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="space-y-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed ? (
              <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                {group.title}
              </div>
            ) : (
              <div className="mx-auto h-px w-8 bg-border/70" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isNovelEntry = item.to === "/novels";

              return (
                <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}>
                  {({ isActive }) => (
                    <div
                      className={cn(
                        "relative flex items-center rounded-md text-sm transition-colors",
                        collapsed ? "justify-center px-2 py-2.5" : "py-2 pl-4 pr-2",
                        isActive
                          ? "bg-accent/90 font-semibold text-accent-foreground"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground",
                        isNovelEntry && !collapsed && (isActive ? "ring-1 ring-primary/20" : "bg-primary/5 hover:bg-primary/10"),
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-transparent",
                          isActive && "bg-primary",
                          collapsed && "left-0.5 h-6",
                        )}
                      />

                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          collapsed ? "mx-auto" : "mr-3",
                          isNovelEntry && "text-primary",
                        )}
                      />

                      {!collapsed ? (
                        <span className={cn("truncate", isNovelEntry && "font-semibold")}>
                          {item.label}
                        </span>
                      ) : null}

                      {renderBadge(item.to)}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
