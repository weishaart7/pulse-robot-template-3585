import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useBlogArticles, BlogArticle } from '@/hooks/useBlogArticles';
import { ArticleEditor } from './ArticleEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AdminArticleList: React.FC = () => {
  const { articles, isLoading, createArticle, updateArticle, deleteArticle, publishArticle } = useBlogArticles();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);

  const handleCreateNew = () => {
    setSelectedArticle(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (article: BlogArticle) => {
    setSelectedArticle(article);
    setEditorOpen(true);
  };

  const handleSave = async (articleData: Partial<BlogArticle>) => {
    if (selectedArticle) {
      await updateArticle(selectedArticle.id, articleData);
    } else {
      await createArticle(articleData as Omit<BlogArticle, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  const handleDeleteClick = (id: string) => {
    setArticleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (articleToDelete) {
      await deleteArticle(articleToDelete);
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };

  const handleTogglePublish = async (article: BlogArticle) => {
    await updateArticle(article.id, { published: !article.published });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des articles...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestion des articles</h2>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel article
          </Button>
        </div>

        {articles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Aucun article pour le moment</p>
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Créer votre premier article
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {articles.map((article) => (
              <Card key={article.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{article.title}</CardTitle>
                      <div className="flex gap-2 items-center">
                        <Badge variant={article.published ? 'default' : 'secondary'}>
                          {article.published ? 'Publié' : 'Brouillon'}
                        </Badge>
                        {article.category && (
                          <Badge variant="outline">{article.category}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(article)}
                      >
                        {article.published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(article)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(article.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {article.excerpt && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{article.excerpt}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <ArticleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        article={selectedArticle}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
