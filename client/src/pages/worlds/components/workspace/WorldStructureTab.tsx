import { useEffect, useMemo, useState } from "react";
import type {
  WorldBindingSupport,
  WorldFaction,
  WorldForce,
  WorldForceRelation,
  WorldLocation,
  WorldLocationControlRelation,
  WorldRule,
  WorldStructuredData,
  WorldStructureSectionKey,
} from "@ai-novel/shared/types/world";
import type { WorldStructurePayload } from "@/api/world";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const SECTION_OPTIONS: Array<{ value: WorldStructureSectionKey; label: string }> = [
  { value: "profile", label: "Tổng quan thế giới" },
  { value: "rules", label: "Trung tâm quy tắc" },
  { value: "factions", label: "Phe phái và thế lực" },
  { value: "locations", label: "Địa điểm và địa hình" },
  { value: "relations", label: "Mạng lưới quan hệ" },
];

function updateArrayItem<T>(items: T[], index: number, nextItem: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function parseTextList(value: string): string[] {
  return value
    .split(/[\n,，;；、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function WorldStructureTab(props: {
  initialPayload?: WorldStructurePayload;
  savePending: boolean;
  backfillPending: boolean;
  generatePending: boolean;
  onSave: (structure: WorldStructuredData, bindingSupport: WorldBindingSupport) => Promise<void>;
  onBackfill: () => Promise<{ structure: WorldStructuredData; bindingSupport: WorldBindingSupport } | undefined>;
  onGenerate: (
    section: WorldStructureSectionKey,
    structure: WorldStructuredData,
    bindingSupport: WorldBindingSupport,
  ) => Promise<{ structure: WorldStructuredData; bindingSupport: WorldBindingSupport } | undefined>;
}) {
  const { initialPayload, savePending, backfillPending, generatePending, onSave, onBackfill, onGenerate } = props;
  const [activeSection, setActiveSection] = useState<WorldStructureSectionKey>("profile");
  const [draftStructure, setDraftStructure] = useState<WorldStructuredData | null>(initialPayload?.structure ?? null);
  const [draftBindingSupport, setDraftBindingSupport] = useState<WorldBindingSupport | null>(
    initialPayload?.bindingSupport ?? null,
  );

  useEffect(() => {
    if (!initialPayload) {
      return;
    }
    setDraftStructure(initialPayload.structure);
    setDraftBindingSupport(initialPayload.bindingSupport);
  }, [initialPayload]);

  const hasStructuredData = Boolean(initialPayload?.hasStructuredData);
  const factionNameById = useMemo(
    () => new Map((draftStructure?.factions ?? []).map((item) => [item.id, item.name])),
    [draftStructure?.factions],
  );
  const forceNameById = useMemo(
    () => new Map((draftStructure?.forces ?? []).map((item) => [item.id, item.name])),
    [draftStructure?.forces],
  );
  const locationNameById = useMemo(
    () => new Map((draftStructure?.locations ?? []).map((item) => [item.id, item.name])),
    [draftStructure?.locations],
  );

  if (!draftStructure || !draftBindingSupport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thiết lập có cấu trúc</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Đang tải dữ liệu thế giới có cấu trúc...</CardContent>
      </Card>
  );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thiết lập có cấu trúc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {SECTION_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={activeSection === option.value ? "default" : "outline"}
                onClick={() => setActiveSection(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const result = await onBackfill();
                if (result) {
                  setDraftStructure(result.structure);
                  setDraftBindingSupport(result.bindingSupport);
                }
              }}
              disabled={backfillPending}
            >
              {backfillPending ? "Đang trích xuất..." : hasStructuredData ? "Trích lại từ thiết lập hiện có" : "Trích cấu trúc từ thiết lập hiện có"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const result = await onGenerate(activeSection, draftStructure, draftBindingSupport);
                if (result) {
                  setDraftStructure(result.structure);
                  setDraftBindingSupport(result.bindingSupport);
                }
              }}
              disabled={generatePending}
            >
              {generatePending ? "Đang bổ sung..." : "AI bổ sung khối hiện tại"}
            </Button>
            <Button onClick={() => void onSave(draftStructure, draftBindingSupport)} disabled={savePending}>
              {savePending ? "Đang lưu..." : "Lưu cấu trúc"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="font-medium">Tổng quan thế giới</div>
          <Input
            value={draftStructure.profile.identity}
            onChange={(event) =>
              setDraftStructure((prev) =>
                prev
                  ? { ...prev, profile: { ...prev.profile, identity: event.target.value } }
                  : prev,
              )
            }
            placeholder="Bản sắc thế giới / khí chất thể loại"
          />
          <Input
            value={draftStructure.profile.tone}
            onChange={(event) =>
              setDraftStructure((prev) =>
                prev
                  ? { ...prev, profile: { ...prev.profile, tone: event.target.value } }
                  : prev,
              )
            }
            placeholder="Tông tổng thể"
          />
          <textarea
            className="min-h-[100px] w-full rounded-md border bg-background p-2 text-sm"
            value={draftStructure.profile.summary}
            onChange={(event) =>
              setDraftStructure((prev) =>
                prev
                  ? { ...prev, profile: { ...prev.profile, summary: event.target.value } }
                  : prev,
              )
            }
            placeholder="Tóm tắt thế giới"
          />
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
            value={draftStructure.profile.coreConflict}
            onChange={(event) =>
              setDraftStructure((prev) =>
                prev
                  ? { ...prev, profile: { ...prev.profile, coreConflict: event.target.value } }
                  : prev,
              )
            }
            placeholder="Xung đột cốt lõi"
          />
          <Input
            value={draftStructure.profile.themes.join("、")}
            onChange={(event) =>
              setDraftStructure((prev) =>
                prev
                  ? {
                    ...prev,
                    profile: {
                      ...prev.profile,
                      themes: event.target.value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
                    },
                  }
                  : prev,
              )
            }
            placeholder="Từ khóa chủ đề, ngăn cách bằng dấu phẩy hoặc dấu chấm giữa"
          />
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Trung tâm quy tắc</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraftStructure((prev) =>
                  prev
                    ? {
                      ...prev,
                      rules: {
                        ...prev.rules,
                        axioms: [
                          ...prev.rules.axioms,
                          {
                            id: `rule-${prev.rules.axioms.length + 1}`,
                            name: "",
                            summary: "",
                            cost: "",
                            boundary: "",
                            enforcement: "",
                          },
                        ],
                      },
                    }
                    : prev,
                )
              }
            >
            Thêm quy tắc
            </Button>
          </div>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
            value={draftStructure.rules.summary}
            onChange={(event) =>
              setDraftStructure((prev) =>
                prev
                  ? { ...prev, rules: { ...prev.rules, summary: event.target.value } }
                  : prev,
              )
            }
            placeholder="Tổng kết quy tắc cấp thế giới"
          />
          {draftStructure.rules.axioms.map((rule, index) => (
            <div key={rule.id || index} className="rounded-md border p-3 space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={rule.name}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          rules: {
                            ...prev.rules,
                            axioms: updateArrayItem<WorldRule>(prev.rules.axioms, index, {
                              ...rule,
                              name: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Tên quy tắc"
                />
                <Input
                  value={rule.cost}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          rules: {
                            ...prev.rules,
                            axioms: updateArrayItem<WorldRule>(prev.rules.axioms, index, {
                              ...rule,
                              cost: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Cái giá"
                />
              </div>
              <textarea
                className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
                value={rule.summary}
                onChange={(event) =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        rules: {
                          ...prev.rules,
                          axioms: updateArrayItem<WorldRule>(prev.rules.axioms, index, {
                            ...rule,
                            summary: event.target.value,
                          }),
                        },
                      }
                      : prev,
                  )
                }
                placeholder="Mô tả quy tắc"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={rule.boundary}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          rules: {
                            ...prev.rules,
                            axioms: updateArrayItem<WorldRule>(prev.rules.axioms, index, {
                              ...rule,
                              boundary: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Điều kiện biên"
                />
                <Input
                  value={rule.enforcement}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          rules: {
                            ...prev.rules,
                            axioms: updateArrayItem<WorldRule>(prev.rules.axioms, index, {
                              ...rule,
                              enforcement: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Ràng buộc / hậu quả khi thực thi"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Phe phái và thế lực</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        factions: [
                          ...prev.factions,
                          {
                            id: `faction-${prev.factions.length + 1}`,
                            name: "",
                            position: "",
                            doctrine: "",
                            goals: [],
                            methods: [],
                            representativeForceIds: [],
                          },
                        ],
                      }
                      : prev,
                  )
                }
              >
                Thêm phe phái
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        forces: [
                          ...prev.forces,
                          {
                            id: `force-${prev.forces.length + 1}`,
                            name: "",
                            type: "",
                            factionId: null,
                            summary: "",
                            baseOfPower: "",
                            currentObjective: "",
                            pressure: "",
                            leader: null,
                            narrativeRole: "",
                          },
                        ],
                      }
                      : prev,
                  )
                }
              >
                Thêm thế lực
              </Button>
            </div>
          </div>
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
            <div>Phe phái = lập trường trừu tượng, tuyến đi hoặc phe đứng trong thế giới; thế lực = tổ chức, vòng tròn, mạng lưới hoặc cơ quan cụ thể.</div>
            <div>Các quy tắc mặc định cấp thế giới như “cơ chế áp lực xã hội”, “quy tắc vận hành ngành nghề”, “quy tắc mạng lưới quan hệ” nên ưu tiên viết vào “Trung tâm quy tắc”, đừng nhét vào thẻ phe phái.</div>
              <div>
                ID phe phái hiện tại：{
                  draftStructure.factions.length > 0
                    ? draftStructure.factions.map((item) => `${item.id} (${item.name || "Chưa đặt tên"})`).join(", ")
                    : "Chưa có"
                }
              </div>
              <div>
                ID thế lực hiện tại：{
                  draftStructure.forces.length > 0
                    ? draftStructure.forces.map((item) => `${item.id} (${item.name || "Chưa đặt tên"})`).join(", ")
                    : "Chưa có"
                }
              </div>
          </div>
          <div className="space-y-3">
            {draftStructure.factions.map((faction, index) => (
              <div key={faction.id || index} className="rounded-md border p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Thẻ phe phái mô tả lập trường trừu tượng, không phải công ty, phòng ban hay mạng lưới quan hệ cụ thể.
                </div>
                <Input
                  value={faction.name}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          factions: updateArrayItem<WorldFaction>(prev.factions, index, {
                            ...faction,
                            name: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Tên phe phái, ví dụ: phe giữ ổn định trong hệ thống / phe theo đuổi lợi nhuận / phe thực dụng dựa quan hệ"
                />
                <Input
                  value={faction.position}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          factions: updateArrayItem<WorldFaction>(prev.factions, index, {
                            ...faction,
                            position: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Lập trường / phe đứng trong thế giới"
                />
                <textarea
                  className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
                  value={faction.doctrine}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          factions: updateArrayItem<WorldFaction>(prev.factions, index, {
                            ...faction,
                            doctrine: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Tư tưởng / tín điều / chủ trương của phe"
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={faction.goals.join("、")}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            factions: updateArrayItem<WorldFaction>(prev.factions, index, {
                              ...faction,
                              goals: parseTextList(event.target.value),
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Mục tiêu dài hạn, ngăn cách bằng dấu phẩy hoặc dấu chấm giữa"
                  />
                  <Input
                    value={faction.methods.join("、")}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            factions: updateArrayItem<WorldFaction>(prev.factions, index, {
                              ...faction,
                              methods: parseTextList(event.target.value),
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Cách làm thường dùng, ngăn cách bằng dấu phẩy hoặc dấu chấm giữa"
                  />
                </div>
                <Input
                  value={faction.representativeForceIds.join("、")}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          factions: updateArrayItem<WorldFaction>(prev.factions, index, {
                            ...faction,
                            representativeForceIds: parseTextList(event.target.value),
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="ID thế lực đại diện, ngăn cách bằng dấu phẩy hoặc dấu chấm giữa"
                />
                {faction.representativeForceIds.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Thế lực đại diện: {faction.representativeForceIds.map((id) => forceNameById.get(id) || id).join("、")}
                  </div>
                ) : null}
              </div>
            ))}
            {draftStructure.forces.map((force, index) => (
              <div key={force.id || index} className="rounded-md border p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Thẻ thế lực mô tả tổ chức hoặc vòng tròn cụ thể có thể gây áp lực, chiếm giữ địa điểm và tham gia mạng lưới quan hệ.
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    value={force.name}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              name: event.target.value,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Tên thế lực, ví dụ: ban quản lý công ty quảng cáo / chuỗi môi giới nhà đất / mạng quan hệ giới kinh doanh địa phương"
                  />
                  <Input
                    value={force.type}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              type: event.target.value,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Loại thế lực, ví dụ: công ty / phòng ban / mạng môi giới / vòng tròn kinh doanh"
                  />
                  <Input
                    value={force.factionId ?? ""}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              factionId: event.target.value || null,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="ID phe phái trực thuộc (có thể để trống)"
                  />
                </div>
                {force.factionId ? (
                  <div className="text-xs text-muted-foreground">
                    Phe phái trực thuộc: {factionNameById.get(force.factionId) || force.factionId}
                  </div>
                ) : null}
                <textarea
                  className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
                  value={force.summary}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          forces: updateArrayItem<WorldForce>(prev.forces, index, {
                            ...force,
                            summary: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Tổng quan thế lực / danh nghĩa bên ngoài / vai trò trong thế giới"
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={force.baseOfPower}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              baseOfPower: event.target.value,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Nền tảng quyền lực / nguồn tài nguyên / điểm kiểm soát"
                  />
                  <Input
                    value={force.currentObjective}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              currentObjective: event.target.value,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Mục tiêu hiện tại / đang muốn đẩy điều gì"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={force.leader ?? ""}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              leader: event.target.value || null,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Người lãnh đạo / nhân vật then chốt (có thể để trống)"
                  />
                  <Input
                    value={force.pressure}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              pressure: event.target.value,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Cách gây áp lực / nguồn sức ép / nó ép nhân vật như thế nào"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-1">
                  <Input
                    value={force.narrativeRole}
                    onChange={(event) =>
                      setDraftStructure((prev) =>
                        prev
                          ? {
                            ...prev,
                            forces: updateArrayItem<WorldForce>(prev.forces, index, {
                              ...force,
                              narrativeRole: event.target.value,
                            }),
                          }
                          : prev,
                      )
                    }
                    placeholder="Vai trò trong truyện, ví dụ: nguồn áp bức / kẻ dẫn dụ / người gác cổng / vùng đệm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Địa điểm và địa hình</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraftStructure((prev) =>
                  prev
                    ? {
                      ...prev,
                      locations: [
                        ...prev.locations,
                        {
                          id: `location-${prev.locations.length + 1}`,
                          name: "",
                          terrain: "",
                          summary: "",
                          narrativeFunction: "",
                          risk: "",
                          entryConstraint: "",
                          exitCost: "",
                          controllingForceIds: [],
                        },
                      ],
                    }
                    : prev,
                )
              }
            >
                Thêm địa điểm
            </Button>
          </div>
          {draftStructure.locations.map((location, index) => (
            <div key={location.id || index} className="rounded-md border p-3 space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={location.name}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          locations: updateArrayItem<WorldLocation>(prev.locations, index, {
                            ...location,
                            name: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Tên địa điểm"
                />
                <Input
                  value={location.terrain}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          locations: updateArrayItem<WorldLocation>(prev.locations, index, {
                            ...location,
                            terrain: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Địa hình / địa mạo"
                />
              </div>
              <textarea
                className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
                value={location.summary}
                onChange={(event) =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        locations: updateArrayItem<WorldLocation>(prev.locations, index, {
                          ...location,
                          summary: event.target.value,
                        }),
                      }
                      : prev,
                  )
                }
                placeholder="Tổng quan địa điểm"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={location.narrativeFunction}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          locations: updateArrayItem<WorldLocation>(prev.locations, index, {
                            ...location,
                            narrativeFunction: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Chức năng trong truyện"
                />
                <Input
                  value={location.risk}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          locations: updateArrayItem<WorldLocation>(prev.locations, index, {
                            ...location,
                            risk: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Rủi ro"
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={location.entryConstraint}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          locations: updateArrayItem<WorldLocation>(prev.locations, index, {
                            ...location,
                            entryConstraint: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Giới hạn vào"
                />
                <Input
                  value={location.exitCost}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          locations: updateArrayItem<WorldLocation>(prev.locations, index, {
                            ...location,
                            exitCost: event.target.value,
                          }),
                        }
                        : prev,
                    )
                  }
                  placeholder="Cái giá khi rời đi"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Mạng lưới quan hệ</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        relations: {
                          ...prev.relations,
                          forceRelations: [
                            ...prev.relations.forceRelations,
                            {
                              id: `force-relation-${prev.relations.forceRelations.length + 1}`,
                              sourceForceId: "",
                              targetForceId: "",
                              relation: "",
                              tension: "",
                              detail: "",
                            },
                          ],
                        },
                      }
                      : prev,
                  )
                }
              >
                Thêm quan hệ thế lực
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        relations: {
                          ...prev.relations,
                          locationControls: [
                            ...prev.relations.locationControls,
                            {
                              id: `location-control-${prev.relations.locationControls.length + 1}`,
                              forceId: "",
                              locationId: "",
                              relation: "",
                              detail: "",
                            },
                          ],
                        },
                      }
                      : prev,
                  )
                }
              >
                Thêm kiểm soát địa điểm
              </Button>
            </div>
          </div>
          {draftStructure.relations.forceRelations.map((relation, index) => (
            <div key={relation.id || index} className="rounded-md border p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                {forceNameById.get(relation.sourceForceId) || relation.sourceForceId || "Thế lực nguồn"} {"->"}{" "}
                {forceNameById.get(relation.targetForceId) || relation.targetForceId || "Thế lực đích"}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={relation.sourceForceId}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          relations: {
                            ...prev.relations,
                            forceRelations: updateArrayItem<WorldForceRelation>(prev.relations.forceRelations, index, {
                              ...relation,
                              sourceForceId: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="ID thế lực nguồn"
                />
                <Input
                  value={relation.targetForceId}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          relations: {
                            ...prev.relations,
                            forceRelations: updateArrayItem<WorldForceRelation>(prev.relations.forceRelations, index, {
                              ...relation,
                              targetForceId: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="ID thế lực đích"
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={relation.relation}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          relations: {
                            ...prev.relations,
                            forceRelations: updateArrayItem<WorldForceRelation>(prev.relations.forceRelations, index, {
                              ...relation,
                              relation: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Loại quan hệ"
                />
                <Input
                  value={relation.tension}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          relations: {
                            ...prev.relations,
                            forceRelations: updateArrayItem<WorldForceRelation>(prev.relations.forceRelations, index, {
                              ...relation,
                              tension: event.target.value,
                            }),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Độ căng / áp lực"
                />
              </div>
              <textarea
                className="min-h-[70px] w-full rounded-md border bg-background p-2 text-sm"
                value={relation.detail}
                onChange={(event) =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        relations: {
                          ...prev.relations,
                          forceRelations: updateArrayItem<WorldForceRelation>(prev.relations.forceRelations, index, {
                            ...relation,
                            detail: event.target.value,
                          }),
                        },
                      }
                      : prev,
                  )
                }
                placeholder="Mô tả quan hệ"
              />
            </div>
          ))}
          {draftStructure.relations.locationControls.map((relation, index) => (
            <div key={relation.id || index} className="rounded-md border p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                {(forceNameById.get(relation.forceId) || relation.forceId || "Thế lực")} kiểm soát{" "}
                {(locationNameById.get(relation.locationId) || relation.locationId || "Địa điểm")}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={relation.forceId}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          relations: {
                            ...prev.relations,
                            locationControls: updateArrayItem<WorldLocationControlRelation>(
                              prev.relations.locationControls,
                              index,
                              { ...relation, forceId: event.target.value },
                            ),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="ID thế lực"
                />
                <Input
                  value={relation.locationId}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          relations: {
                            ...prev.relations,
                            locationControls: updateArrayItem<WorldLocationControlRelation>(
                              prev.relations.locationControls,
                              index,
                              { ...relation, locationId: event.target.value },
                            ),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="ID địa điểm"
                />
              </div>
              <Input
                value={relation.relation}
                onChange={(event) =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        relations: {
                          ...prev.relations,
                          locationControls: updateArrayItem<WorldLocationControlRelation>(
                            prev.relations.locationControls,
                            index,
                            { ...relation, relation: event.target.value },
                          ),
                        },
                      }
                      : prev,
                  )
                }
                placeholder="Quan hệ kiểm soát"
              />
              <textarea
                className="min-h-[70px] w-full rounded-md border bg-background p-2 text-sm"
                value={relation.detail}
                onChange={(event) =>
                  setDraftStructure((prev) =>
                    prev
                      ? {
                        ...prev,
                        relations: {
                          ...prev.relations,
                          locationControls: updateArrayItem<WorldLocationControlRelation>(
                            prev.relations.locationControls,
                            index,
                            { ...relation, detail: event.target.value },
                          ),
                        },
                      }
                      : prev,
                  )
                }
                placeholder="Mô tả"
              />
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium">Gợi ý liên kết</div>
          <div className="text-xs text-muted-foreground">Giai đoạn này chỉ hiển thị để tham khảo, chưa nối với binding truyện.</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Điểm vào khuyến nghị</div>
              <div className="mt-2 whitespace-pre-wrap">
                {draftBindingSupport.recommendedEntryPoints.join("\n") || "Chưa có"}
              </div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Thế lực áp lực cao</div>
              <div className="mt-2 whitespace-pre-wrap">
                {draftBindingSupport.highPressureForces.join("\n") || "Chưa có"}
              </div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Xung đột có thể tương thích</div>
              <div className="mt-2 whitespace-pre-wrap">
                {draftBindingSupport.compatibleConflicts.join("\n") || "Chưa có"}
              </div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Tổ hợp cấm</div>
              <div className="mt-2 whitespace-pre-wrap">
                {draftBindingSupport.forbiddenCombinations.join("\n") || "Chưa có"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
