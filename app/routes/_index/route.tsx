import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";
import { logger } from "../../services/logger.server.ts";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  logger.debug("Index loader - Request URL", { url: request.url });
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  logger.debug("Index loader - Shop param", { shop });
  
  if (shop) {
    logger.info("Index loader - Redirecting to /app", { shop });
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  logger.debug("Index loader - Showing login form");
  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Product Builder Pro</h1>
        <p className={styles.text}>
          A guided multi-step wizard that helps you create products with confidence. Follow our proven workflow to ensure every product detail is perfect.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Smart Two-Phase Workflow</strong>. Phase 1 guides you through vendor selection, product details, AI description generation, and tagging. Phase 2 handles variant configuration or simple SKU assignment based on your needs.
          </li>
          <li>
            <strong>AI-Enhanced Descriptions</strong>. Generate SEO-optimized product descriptions and meta tags automatically. Our AI analyzes your product details to create compelling, keyword-rich content that converts.
          </li>
          <li>
            <strong>Flexible Variant System</strong>. Configure up to 100 variants with custom options (size, color, material, etc.). Bulk assign SKUs, barcodes, and pricing. Or skip variants entirely for simple products.
          </li>
        </ul>
      </div>
    </div>
  );
}
