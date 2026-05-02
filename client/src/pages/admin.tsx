import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ThemeToggle } from "@/components/theme-toggle";
import { Plus, Edit, Trash2, Eye, EyeOff, LogOut, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";

const articleSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  content: z.string().optional(),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  category: z.enum(["cultura", "esportes", "shows", "vida-noturna", "geral"]),
  author: z.string().optional(),
  source: z.string().optional(),
  url: z.string().optional(),
  isDraft: z.boolean().optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  imageUrl?: string;
  category: string;
  source: string;
  publishedAt: string;
  url?: string;
  author?: string;
  isDraft?: boolean;
  isManual?: boolean;
  views?: number;
}

interface GeneratedArticle {
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  sources: string[];
  imageUrl?: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);

  // AI generation state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [aiCategory, setAiCategory] = useState("geral");
  const [aiTone, setAiTone] = useState("jornalistico");
  const [aiFocus, setAiFocus] = useState("");
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/admin/news"],
  });

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      imageUrl: "",
      category: "geral",
      author: user?.name || "",
      source: "Diário do Carioca",
      url: "",
      isDraft: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ArticleFormData) =>
      apiRequest("POST", "/api/admin/news", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Sucesso!",
        description: "Artigo criado com sucesso",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar artigo",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ArticleFormData> }) =>
      apiRequest("PUT", `/api/admin/news/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Sucesso!",
        description: "Artigo atualizado com sucesso",
      });
      setIsDialogOpen(false);
      setEditingArticle(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar artigo",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/news/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Sucesso!",
        description: "Artigo deletado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao deletar artigo",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/login");
    },
  });

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGeneratedArticle(null);
    try {
      const res = await apiRequest("POST", "/api/admin/ai/generate", {
        category: aiCategory,
        tone: aiTone,
        focus: aiFocus || undefined,
      });
      const data = await res.json();
      setGeneratedArticle(data);
    } catch (err: any) {
      toast({ title: "Erro na IA", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAIMutation = useMutation({
    mutationFn: async (asDraft: boolean) => {
      const res = await apiRequest("POST", "/api/admin/ai/save", {
        ...generatedArticle,
        imageUrl: generatedArticle?.imageUrl,
        isDraft: asDraft,
      });
      return res.json();
    },
    onSuccess: (_, asDraft) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Artigo salvo!",
        description: asDraft ? "Salvo como rascunho" : "Publicado com sucesso",
      });
      setGeneratedArticle(null);
      setIsAIPanelOpen(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar artigo", variant: "destructive" });
    },
  });

  const handleSubmit = (data: ArticleFormData) => {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    const isDraft = article.isDraft || false;
    form.reset({
      title: article.title,
      description: article.description,
      content: article.content || "",
      imageUrl: article.imageUrl || "",
      category: article.category as any,
      author: article.author || "",
      source: article.source,
      url: article.url || "",
      isDraft: isDraft,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este artigo?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleDraft = (article: NewsArticle, isDraft: boolean) => {
    updateMutation.mutate({
      id: article.id,
      data: { isDraft },
    });
  };

  const handleNewArticle = () => {
    setEditingArticle(null);
    form.reset({
      title: "",
      description: "",
      content: "",
      imageUrl: "",
      category: "geral",
      author: user?.name || "",
      source: "Diário do Carioca",
      url: "",
      isDraft: false,
    });
    setIsDialogOpen(true);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      cultura: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
      esportes: "bg-green-500/20 text-green-700 dark:text-green-300",
      shows: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
      "vida-noturna": "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      geral: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
    };
    return colors[category] || colors.geral;
  };

  const topArticles = [...articles]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10)
    .map(article => ({
      title: article.title.length > 30 ? article.title.substring(0, 30) + "..." : article.title,
      fullTitle: article.title,
      views: article.views || 0,
      category: article.category,
    }));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-title">
              Painel Administrativo
            </h1>
            <p className="text-sm text-muted-foreground">
              Bem-vindo, {user?.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="conteudo" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="conteudo">Gerenciar Conteúdo</TabsTrigger>
            <TabsTrigger value="metricas">Métricas e Análises</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conteudo" className="space-y-6">
            {/* AI Generation Panel */}
            <Card className="mb-6 border-purple-200 dark:border-purple-800">
          <div
            className="flex items-center justify-between p-4 cursor-pointer select-none"
            onClick={() => setIsAIPanelOpen((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold">Gerar Artigo com IA</h2>
              <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                Gemini 2.5 Flash
              </span>
            </div>
            {isAIPanelOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>

          {isAIPanelOpen && (
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                A IA lê as notícias recentes da categoria selecionada e cria um artigo original para o portal.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Categoria</label>
                  <Select value={aiCategory} onValueChange={setAiCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="cultura">Cultura</SelectItem>
                      <SelectItem value="esportes">Esportes</SelectItem>
                      <SelectItem value="shows">Shows</SelectItem>
                      <SelectItem value="gastronomia">Gastronomia</SelectItem>
                      <SelectItem value="internacional">Internacional</SelectItem>
                      <SelectItem value="vida-noturna">Vida Noturna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Tom editorial</label>
                  <Select value={aiTone} onValueChange={setAiTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jornalistico">Jornalístico</SelectItem>
                      <SelectItem value="descontraido">Descontraído</SelectItem>
                      <SelectItem value="analitico">Analítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Foco temático (opcional)</label>
                  <Input
                    value={aiFocus}
                    onChange={(e) => setAiFocus(e.target.value)}
                    placeholder="Ex: Flamengo, Carnaval, Lapa..."
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando artigo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Artigo
                  </>
                )}
              </Button>

              {generatedArticle && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg leading-tight">{generatedArticle.title}</h3>
                    <Badge className="bg-purple-100 text-purple-700 shrink-0">Gerado pela IA</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{generatedArticle.description}</p>

                  <div
                    className="text-sm prose prose-sm max-w-none border-t pt-3"
                    dangerouslySetInnerHTML={{ __html: generatedArticle.content }}
                  />

                  {generatedArticle.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 border-t pt-3">
                      {generatedArticle.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {generatedArticle.sources.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Baseado em: {generatedArticle.sources.join(", ")}
                    </p>
                  )}

                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      onClick={() => saveAIMutation.mutate(false)}
                      disabled={saveAIMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Publicar agora
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveAIMutation.mutate(true)}
                      disabled={saveAIMutation.isPending}
                    >
                      Salvar como rascunho
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setGeneratedArticle(null)}
                    >
                      Descartar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold" data-testid="text-news-heading">
            Gerenciar Notícias
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewArticle} data-testid="button-new-article">
                <Plus className="w-4 h-4 mr-2" />
                Novo Artigo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle data-testid="text-dialog-title">
                  {editingArticle ? "Editar Artigo" : "Novo Artigo"}
                </DialogTitle>
                {editingArticle && (
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant={form.watch("isDraft") ? "outline" : "default"}
                      className={
                        form.watch("isDraft")
                          ? ""
                          : "bg-green-500/20 text-green-700 dark:text-green-300"
                      }
                    >
                      {form.watch("isDraft") ? "Rascunho" : "Publicado"}
                    </Badge>
                  </div>
                )}
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Digite o título"
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Resumo do artigo"
                            rows={3}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteúdo</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Conteúdo completo do artigo"
                            rows={6}
                            data-testid="input-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da Imagem</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.com/image.jpg"
                            data-testid="input-imageurl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cultura" data-testid="option-cultura">Cultura</SelectItem>
                              <SelectItem value="esportes" data-testid="option-esportes">Esportes</SelectItem>
                              <SelectItem value="shows" data-testid="option-shows">Shows</SelectItem>
                              <SelectItem value="vida-noturna" data-testid="option-vida-noturna">
                                Vida Noturna
                              </SelectItem>
                              <SelectItem value="geral" data-testid="option-geral">Geral</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Autor</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Nome do autor"
                              data-testid="input-author"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fonte</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Rio Notícias"
                            data-testid="input-source"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      onClick={() => form.setValue("isDraft", false)}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-publish"
                    >
                      {editingArticle ? "Atualizar e Publicar" : "Publicar"}
                    </Button>
                    <Button
                      type="submit"
                      variant="outline"
                      onClick={() => form.setValue("isDraft", true)}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-draft"
                    >
                      Salvar como Rascunho
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingArticle(null);
                        form.reset();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          {isLoading ? (
            <div className="p-8 text-center">
              <p>Carregando...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Nenhum artigo encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visualizações</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => {
                  const isDraft = article.isDraft || false;
                  const isManual = article.isManual || false;
                  
                  return (
                    <TableRow key={article.id} data-testid={`row-article-${article.id}`}>
                      <TableCell className="font-medium max-w-md truncate" data-testid="text-title">
                        {article.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadgeColor(article.category)}>
                          {article.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {article.source}
                      </TableCell>
                      <TableCell>
                        {isDraft ? (
                          <Badge variant="outline" data-testid="badge-draft">Rascunho</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-300" data-testid="badge-published">
                            Publicado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {article.views || 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(article.publishedAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isManual && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(article)}
                                data-testid="button-edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleDraft(article, !isDraft)}
                                data-testid="button-toggle-draft"
                              >
                                {isDraft ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(article.id)}
                                disabled={deleteMutation.isPending}
                                data-testid="button-delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
          </TabsContent>

          <TabsContent value="metricas">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6">Top 10 Artigos Mais Acessados</h3>
              <div className="space-y-3 mt-4">
                {topArticles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum dado de acesso disponível ainda.</p>
                ) : (
                  topArticles.map((article, index) => (
                    <div key={index} className="flex justify-between items-center p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex gap-4 items-center overflow-hidden pr-4">
                        <span className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 1}º</span>
                        <div className="truncate">
                          <p className="font-semibold truncate" title={article.fullTitle}>{article.fullTitle}</p>
                          <p className="text-sm text-muted-foreground capitalize">{article.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold whitespace-nowrap">
                        <Eye className="w-4 h-4" />
                        {article.views} acessos
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
