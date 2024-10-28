import * as _ from "lodash";
import BoxSkeleton from "./templates/BoxSkeleton";
import DefaultSkeleton from "./templates/Default";
import TableSkeleton from "./templates/TableSkeleton";
import CardSkeleton from "./templates/CardSkeleton";

const Skeleton: any = (props: any) => {
    const { type, config = {} } = props;

    const skeletonType = {
        "card": <CardSkeleton config={config} />,
        "box": <BoxSkeleton config={config} />,
        "table": <TableSkeleton config={config} />
    }

    return <>
        {_.get(skeletonType, type) || <DefaultSkeleton config={config} />}
    </>
}

export default Skeleton;