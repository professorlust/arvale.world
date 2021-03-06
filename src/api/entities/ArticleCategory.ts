import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'

import { Article } from './Article'

@Entity({ name: 'article_category' })
export class ArticleCategory extends BaseEntity {

  slug: string

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @OneToMany(type => Article, article => article.category)
  articles: Article[]

}
