import {appCollections,listCollectionApps} from '../../../lib/collections';
import {visibleApps} from '../../../lib/catalog';
import type {CatalogApp} from '../../../lib/types';
import {allowedPath,serializeCollectionMarkdown} from '../../../lib/feed-parity';
export function getStaticPaths(){return appCollections.filter(c=>allowedPath(`/collections/${c.slug}`)).map(collection=>({params:{slug:collection.slug},props:{collection}}));}
export function GET({props}:{props:{collection:typeof appCollections[number]}}){const apps=listCollectionApps(props.collection,visibleApps('en') as unknown as CatalogApp[]);return new Response(serializeCollectionMarkdown(props.collection,apps),{headers:{'Content-Type':'text/markdown; charset=utf-8'}});}
