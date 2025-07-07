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
        <h1 className={styles.heading}>A short heading about [your app]</h1>
        <p className={styles.text}>
          A tagline about [your app] that describes your value proposition.
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
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
        </ul>
      </div>
    </div>
  );
}
