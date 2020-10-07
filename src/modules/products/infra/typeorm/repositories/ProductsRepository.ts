import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = await this.ormRepository.create({ name, price, quantity });

    await this.ormRepository.save(product);

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({ where: { name } });

    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const productsFound = await this.ormRepository.findByIds(products);

    return productsFound;
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    const productsIds = products.map(product => product.id);

    const productsUpdatable = await this.ormRepository.findByIds(productsIds);

    const productsUpdated: Product[] = [];

    const updates = productsUpdatable.map(async product => {
      const updated: Product = { ...product };

      const productSold = products.find(item => item.id === product.id);

      if (productSold) {
        updated.quantity -= productSold.quantity;

        productsUpdated.push(updated);

        await this.ormRepository.save(updated);
      }
    });

    await Promise.all(updates);

    return productsUpdated;
  }
}

export default ProductsRepository;
