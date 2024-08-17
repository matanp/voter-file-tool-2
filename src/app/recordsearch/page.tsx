import { RecordsList } from "./RecordsList";
import prisma from "~/lib/prisma";

const RecordSearch: React.FC = async () => {
  const dropdownList = await prisma.dropdownLists.findFirst();

  if (!dropdownList) {
    return <div>No dropdown lists found</div>;
  }

  return (
    <div className="w-full">
      {/* <h1 className="text-center">Admin Page</h1>
      <Input type="file" />
      <Button>helllllo world</Button> */}
      <RecordsList dropdownList={dropdownList} />
    </div>
  );
};

export default RecordSearch;
