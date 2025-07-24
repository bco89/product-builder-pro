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
          Create products effortlessly with AI-powered descriptions and guided workflows.
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
            <strong>AI-Powered Descriptions</strong>. Generate compelling product descriptions automatically using advanced AI technology.
          </li>
          <li>
            <strong>Guided Product Creation</strong>. Step-by-step wizard ensures you never miss important product details.
          </li>
          <li>
            <strong>Variant Management</strong>. Easily create and manage up to 100 product variants with bulk editing tools.
          </li>
        </ul>
      </div>
    </div>
  );
}
