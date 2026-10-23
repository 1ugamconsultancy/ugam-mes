import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { BatchRecipe } from './recipes.entity';
import { Product } from '../work-orders/work-orders.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BatchRecipe, Product])],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService, TypeOrmModule],
})
export class RecipesModule {}
