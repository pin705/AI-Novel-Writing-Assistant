import {
  BookOpenText,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Compass,
  KeyRound,
  ListTodo,
  Route,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

const DIRECTOR_CREATE_LINK = "/novels/create?mode=director";

interface GuideStep {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

interface GoalEntry {
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
  href: string;
  icon: LucideIcon;
}

interface FaqItem {
  questionKey: string;
  answerKey: string;
}

const guideSteps: GuideStep[] = [
  {
    titleKey: "help.guide.steps.configureModel.title",
    descriptionKey: "help.guide.steps.configureModel.description",
    icon: KeyRound,
  },
  {
    titleKey: "help.guide.steps.inputInspiration.title",
    descriptionKey: "help.guide.steps.inputInspiration.description",
    icon: Sparkles,
  },
  {
    titleKey: "help.guide.steps.letAutoDirector.title",
    descriptionKey: "help.guide.steps.letAutoDirector.description",
    icon: Compass,
  },
  {
    titleKey: "help.guide.steps.confirmDirection.title",
    descriptionKey: "help.guide.steps.confirmDirection.description",
    icon: CheckCircle2,
  },
  {
    titleKey: "help.guide.steps.advanceToWriting.title",
    descriptionKey: "help.guide.steps.advanceToWriting.description",
    icon: Workflow,
  },
  {
    titleKey: "help.guide.steps.enterChapterExecution.title",
    descriptionKey: "help.guide.steps.enterChapterExecution.description",
    icon: BookOpenText,
  },
  {
    titleKey: "help.guide.steps.reviewTasks.title",
    descriptionKey: "help.guide.steps.reviewTasks.description",
    icon: ListTodo,
  },
];

const goalEntries: GoalEntry[] = [
  {
    titleKey: "help.goals.entries.startFromScratch.title",
    descriptionKey: "help.goals.entries.startFromScratch.description",
    actionKey: "help.goals.entries.startFromScratch.action",
    href: DIRECTOR_CREATE_LINK,
    icon: Sparkles,
  },
  {
    titleKey: "help.goals.entries.continueProject.title",
    descriptionKey: "help.goals.entries.continueProject.description",
    actionKey: "help.goals.entries.continueProject.action",
    href: "/novels",
    icon: BookOpenText,
  },
  {
    titleKey: "help.goals.entries.configureProvider.title",
    descriptionKey: "help.goals.entries.configureProvider.description",
    actionKey: "help.goals.entries.configureProvider.action",
    href: "/settings",
    icon: Route,
  },
  {
    titleKey: "help.goals.entries.handleTasks.title",
    descriptionKey: "help.goals.entries.handleTasks.description",
    actionKey: "help.goals.entries.handleTasks.action",
    href: "/tasks",
    icon: ClipboardList,
  },
  {
    titleKey: "help.goals.entries.directorFollowUps.title",
    descriptionKey: "help.goals.entries.directorFollowUps.description",
    actionKey: "help.goals.entries.directorFollowUps.action",
    href: "/auto-director/follow-ups",
    icon: Workflow,
  },
  {
    titleKey: "help.goals.entries.tuneStyle.title",
    descriptionKey: "help.goals.entries.tuneStyle.description",
    actionKey: "help.goals.entries.tuneStyle.action",
    href: "/style-engine",
    icon: WandSparkles,
  },
];

const faqItems: FaqItem[] = [
  {
    questionKey: "help.faq.items.needOutline.question",
    answerKey: "help.faq.items.needOutline.answer",
  },
  {
    questionKey: "help.faq.items.knowledgeBaseRequired.question",
    answerKey: "help.faq.items.knowledgeBaseRequired.answer",
  },
  {
    questionKey: "help.faq.items.taskFailed.question",
    answerKey: "help.faq.items.taskFailed.answer",
  },
  {
    questionKey: "help.faq.items.qualityPending.question",
    answerKey: "help.faq.items.qualityPending.answer",
  },
];

export default function HelpPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <section className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{t("help.hero.newcomerBadge")}</Badge>
              <Badge variant="outline">{t("help.hero.recommendedBadge")}</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              {t("help.hero.title")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              {t("help.hero.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to={DIRECTOR_CREATE_LINK}>{t("help.hero.startCta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/settings">{t("help.hero.configureModelCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-amber-300 bg-amber-50/80">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-700" />
            <CardTitle className="text-lg text-amber-950">{t("help.modelNotice.title")}</CardTitle>
          </div>
          <CardDescription className="text-amber-900/80">
            {t("help.modelNotice.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/settings">{t("help.modelNotice.cta")}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("help.guide.title")}</CardTitle>
          <CardDescription>{t("help.guide.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {guideSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.titleKey} className="rounded-lg border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div className="font-semibold">{t(step.titleKey)}</div>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{t(step.descriptionKey)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("help.goals.title")}</CardTitle>
          <CardDescription>{t("help.goals.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {goalEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <div key={entry.titleKey} className="flex flex-col justify-between gap-4 rounded-lg border bg-background p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="font-semibold">{t(entry.titleKey)}</div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{t(entry.descriptionKey)}</p>
                  </div>
                  <Button asChild variant="outline" className="w-full justify-center">
                    <Link to={entry.href}>{t(entry.actionKey)}</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CircleHelp className="h-5 w-5 text-primary" />
            <CardTitle>{t("help.faq.title")}</CardTitle>
          </div>
          <CardDescription>{t("help.faq.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.questionKey} className="rounded-lg border bg-background p-4">
                <div className="font-semibold">{t(item.questionKey)}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.answerKey)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
