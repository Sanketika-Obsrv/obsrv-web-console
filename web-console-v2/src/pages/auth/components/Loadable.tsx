/* eslint-disable */
import Loader from './Loader';
import { ElementType, Suspense } from 'react';

const Loadable = (Component: ElementType) => (props: any) =>
(
    <Suspense fallback={<Loader />}>
        <Component {...props} />
    </Suspense>
);

export default Loadable;
