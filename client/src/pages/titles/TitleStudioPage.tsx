import { useMemo, useState } from "react";
import { NOVEL_LIST_PAGE_LIMIT_MAX } from "@ai-novel/shared/types/pagination";
import { useQuery } from "@tanstack/react-query";
import { flattenGenreTreeOptions, getGenreTree } from "@/api/genre";
import { getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TitleFactoryPanel from "./components/TitleFactoryPanel";
import TitleLibraryPanel from "./components/TitleLibraryPanel";

export default function TitleStudioPage() {
  const [tab, setTab] = useState("factory");
  const genreTreeQuery = useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: getGenreTree,
  });
  const novelListQuery = useQuery({
    queryKey: queryKeys.novels.list(1, NOVEL_LIST_PAGE_LIMIT_MAX),
    queryFn: () => getNovelList({ page: 1, limit: NOVEL_LIST_PAGE_LIMIT_MAX }),
  });

  const genreTree = genreTreeQuery.data?.data ?? [];
  const genreOptions = useMemo(() => flattenGenreTreeOptions(genreTree), [genreTree]);
  const novels = novelListQuery.data?.data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Xưởng tiêu đề</CardTitle>
          <CardDescription>
            Gộp “tạo tiêu đề” và “lưu trữ tiêu đề” thành một mô-đun tài sản chính thức. Xưởng lo phần sinh ý tưởng, còn kho tiêu đề lo tái sử dụng và thống kê.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="factory">Xưởng tiêu đề</TabsTrigger>
              <TabsTrigger value="library">Kho tiêu đề</TabsTrigger>
            </TabsList>

            <TabsContent value="factory">
              <TitleFactoryPanel genreTree={genreTree} novels={novels} />
            </TabsContent>

            <TabsContent value="library">
              <TitleLibraryPanel genreOptions={genreOptions} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
