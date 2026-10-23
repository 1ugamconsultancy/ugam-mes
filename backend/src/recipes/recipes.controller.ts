import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('recipes')
@UseGuards(AuthGuard)
export class RecipesController {
  @Roles('PRODUCTION_MANAGER','ADMIN')
  @Post(':id/evidence-revision')
  evidenceRevision(@Param('id') id:string,@Body() dto:any,@Req() req:any) {
    return this.recipesService.evidenceRevision(req.user.sub,id,dto.requirements);
  }
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async getRecipes() {
    return this.recipesService.getRecipes();
  }

  @Get('products')
  async getProducts() {
    return this.recipesService.getProducts();
  }

  @Get('boms')
  async getAllBoms() {
    return this.recipesService.getAllBoms();
  }

  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'ADMIN')
  @Post('boms/revise')
  async reviseBom(@Body() dto: any) {
    return this.recipesService.reviseBom(dto);
  }

  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'ADMIN')
  @Post('boms')
  async createBom(@Body() dto: any) {
    return this.recipesService.createBom(dto);
  }

  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'ADMIN')
  @Post('revise')
  async reviseRecipe(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.sub;
    return this.recipesService.reviseRecipe(userId, dto);
  }

  @Get(':id')
  async getRecipeById(@Param('id') id: string) {
    return this.recipesService.getRecipeById(id);
  }

  @Get('product/:sku')
  async getRecipeByProductSku(@Param('sku') sku: string) {
    return this.recipesService.getRecipeByProductSku(sku);
  }

  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'ADMIN')
  @Post()
  async createRecipe(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.sub;
    return this.recipesService.createRecipe(userId, dto);
  }
}
