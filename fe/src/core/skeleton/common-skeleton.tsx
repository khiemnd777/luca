import { Skeleton } from "@core/skeleton/skeleton";
import { OneColumn } from "@core/skeleton/one-column";
import { TwoColumns } from "@core/skeleton/two-columns";

export interface CommonSkeletonProps {
  prefix: string;
  headerTwoColumns?: boolean;
}

export function CommonSkeleton({
  prefix,
  headerTwoColumns = true,
}: CommonSkeletonProps) {
  return (
    <Skeleton
      prefix={prefix}
      header={
        headerTwoColumns ? (
          <TwoColumns name={`${prefix}:header`} />
        ) : (
          <OneColumn
            name={`${prefix}:header`}
            direction="row"
            justifyContent="space-between"
          />
        )
      }
      body={[
        <OneColumn key="body-header" name={`${prefix}:body:header`} />,
        <OneColumn key="body-top" name={`${prefix}:body:top`} grid />,
        <OneColumn key="body-center" name={`${prefix}:body:center`} />,
      ]}
      footer={
        <OneColumn
          name={`${prefix}:footer`}
          direction="row"
          expandChildren
        />
      }
      maxWidth="lg"
    />
  );
}
