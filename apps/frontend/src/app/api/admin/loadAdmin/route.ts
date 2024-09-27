import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";

const developerEmails = ["mpresberg@gmail.com", "avi.presberg@gmail.com"];

export async function POST() {
  try {
    for (const email of developerEmails) {
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      if (user) {
        await prisma.user.update({
          where: {
            email: user.email,
          },
          data: {
            privilegeLevel: "Developer",
          },
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
