import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  author_id?: string;
  published: boolean;
  published_at?: string;
  featured_image_url?: string;
  tags?: string[];
  category?: string;
  created_at: string;
  updated_at: string;
}

export const useBlogArticles = () => {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchArticles = async (publishedOnly = false) => {
    try {
      setIsLoading(true);
      let query = supabase.from('blog_articles').select('*').order('created_at', { ascending: false });
      
      if (publishedOnly) {
        query = query.eq('published', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createArticle = async (article: Omit<BlogArticle, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('blog_articles')
        .insert([{ ...article, author_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article créé avec succès",
      });

      await fetchArticles();
      return data;
    } catch (error) {
      console.error('Error creating article:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'article",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateArticle = async (id: string, updates: Partial<BlogArticle>) => {
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article mis à jour avec succès",
      });

      await fetchArticles();
      return data;
    } catch (error) {
      console.error('Error updating article:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'article",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteArticle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article supprimé avec succès",
      });

      await fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'article",
        variant: "destructive",
      });
      throw error;
    }
  };

  const publishArticle = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .update({ 
          published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article publié avec succès",
      });

      await fetchArticles();
      return data;
    } catch (error) {
      console.error('Error publishing article:', error);
      toast({
        title: "Erreur",
        description: "Impossible de publier l'article",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return {
    articles,
    isLoading,
    fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    publishArticle,
  };
};
