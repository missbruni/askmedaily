import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return {
    title: "Maintenance",
  };
};

export default function Maintenance() {
  return (
    <div className="align-center flex min-h-full flex-col justify-center gap-5 bg-[#252525]">
      <div className="text-center text-3xl font-extrabold tracking-tight">
        <p className="block  text-white drop-shadow-md sm:text-3xl lg:text-5xl">
          I am making this page better.
        </p>
      </div>
      <div className="text-center text-3xl font-extrabold tracking-tight">
        <p className="block  text-white drop-shadow-md sm:text-2xl lg:text-4xl">
          Bear with me.
        </p>
      </div>
      <div className="flex flex-col items-center">
        <img
          className="-mt-12"
          alt="maintenance-gif"
          title="maintenance"
          src="/images/coding.gif"
          width="300"
        />
      </div>
    </div>
  );
}
