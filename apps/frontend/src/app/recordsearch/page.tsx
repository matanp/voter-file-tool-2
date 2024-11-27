import { RecordsList } from "./RecordsList";
import prisma from "~/lib/prisma";

const RecordSearch: React.FC = async () => {
  const dropdownList = await prisma.dropdownLists.findFirst();

  if (!dropdownList) {
    return <div>No dropdown lists found</div>;
  }

  return (
    <div className="w-full">
      <RecordsList dropdownList={dropdownList} />
    </div>
  );
};

export default RecordSearch;
