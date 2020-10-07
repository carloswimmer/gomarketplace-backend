import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';
import OrdersProducts from '../infra/typeorm/entities/OrdersProducts';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerFound = await this.customersRepository.findById(customer_id);

    if (!customerFound) {
      throw new AppError('Make an order using a valid customer.');
    }

    const productsFound = await this.productsRepository.findAllById(products);

    if (productsFound.length < products.length) {
      throw new AppError('There are invalid products in your list.');
    }

    const productsWithNoQuantity = productsFound.filter(product => {
      const equivalent = products.find(item => item.id === product.id);

      if (equivalent && equivalent.quantity > product.quantity) {
        return product;
      }

      return undefined;
    });

    if (productsWithNoQuantity.length) {
      throw new AppError(
        `We have less ${productsWithNoQuantity[0].name} then you order.`,
      );
    }

    const serializedProducts = products.map(product => {
      const priceFound = productsFound.find(found => product.id === found.id)
        ?.price as number;

      const serialized = {
        product_id: product.id,
        price: priceFound,
        quantity: product.quantity,
      };

      return serialized;
    });

    const order = await this.ordersRepository.create({
      customer: customerFound,
      products: serializedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
