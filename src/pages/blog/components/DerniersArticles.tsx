import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';

export const DerniersArticles = () => {
  const articles = [
    {
      id: 1,
      title: "Optimisation fiscale 2024 : les nouvelles mesures",
      description: "Découvrez les dernières évolutions fiscales et comment optimiser votre situation pour l'année 2024.",
      author: "Marie Dupont",
      date: "15 mars 2024",
      readTime: "5 min",
      category: "Fiscalité",
      image: "/api/placeholder/400/200"
    },
    {
      id: 2,
      title: "Transmission de patrimoine : préparer sa succession",
      description: "Guide complet pour organiser la transmission de votre patrimoine dans les meilleures conditions.",
      author: "Jean Martin",
      date: "12 mars 2024", 
      readTime: "8 min",
      category: "Transmission",
      image: "/api/placeholder/400/200"
    },
    {
      id: 3,
      title: "Investissement locatif : tendances du marché",
      description: "Analyse des opportunités d'investissement immobilier et des tendances actuelles du marché.",
      author: "Sophie Bernard",
      date: "10 mars 2024",
      readTime: "6 min", 
      category: "Investissement",
      image: "/api/placeholder/400/200"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="aspect-video bg-muted"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{article.category}</Badge>
              </div>
              <CardTitle className="line-clamp-2 text-lg">{article.title}</CardTitle>
              <CardDescription className="line-clamp-3">
                {article.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{article.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{article.readTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center">
        <button className="text-primary hover:underline">
          Voir tous les articles →
        </button>
      </div>
    </div>
  );
};