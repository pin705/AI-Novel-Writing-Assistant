import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";


export default function AstrologyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("占星灵感")}</CardTitle>
        <CardDescription>{t("占星模块占位页。")}</CardDescription>
      </CardHeader>
      <CardContent>{t("后续将在此接入题材化灵感生成与设定扩展能力。")}</CardContent>
    </Card>
  );
}
