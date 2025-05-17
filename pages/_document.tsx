import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Add proper preload attributes for fonts and other resources */}
          <link 
            rel="preload" 
            href="/jiravision_logo.png" 
            as="image" 
            type="image/png"
          />
          {/* You can add other preloaded resources here with proper as attributes */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
