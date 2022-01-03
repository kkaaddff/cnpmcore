import { EggContextHttpClient, EggLogger } from 'egg';
import { AbstractBinary, FetchResult, BinaryItem } from './AbstractBinary';

export class NodeBinary extends AbstractBinary {
  private distUrl: string;

  constructor(httpclient: EggContextHttpClient, logger: EggLogger, distUrl: string) {
    super(httpclient, logger);
    this.distUrl = distUrl;
  }

  async fetch(dir: string): Promise<FetchResult | undefined> {
    const url = `${this.distUrl}${dir}`;
    const { status, data, headers } = await this.httpclient.request(url, {
      timeout: 10000,
    });
    const html = data.toString() as string;
    if (status !== 200) {
      this.logger.warn('[NodeBinary.fetch:non-200-status] status: %s, headers: %j, html: %j', status, headers, html);
      return;
    }
    // <a href="v9.8.0/">v9.8.0/</a>                                            08-Mar-2018 01:55                   -
    // <a href="v9.9.0/">v9.9.0/</a>                                            21-Mar-2018 15:47                   -
    // <a href="index.json">index.json</a>                                         17-Dec-2021 23:16              219862
    // <a href="index.tab">index.tab</a>                                          17-Dec-2021 23:16              136319
    // <a href="node-0.0.1.tar.gz">node-0.0.1.tar.gz</a>                                  26-Aug-2011 16:22             2846972
    const re = /<a [^>]+?>([^<]+?)<\/a>\s+?([\w\-]+? \w{2}\:\d{2})\s+?(\d+|\-)/ig;
    const matchs = html.matchAll(re);
    const items: BinaryItem[] = [];
    for (const m of matchs) {
      const name = m[1];
      const isDir = name.endsWith('/');
      const fileUrl = isDir ? '' : `${url}${name}`;
      const date = m[2];
      const size = m[3];
      items.push({
        name,
        isDir,
        url: fileUrl,
        size,
        date,
      });
    }
    return { items, nextParams: null };
  }
}
