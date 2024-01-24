import { Resolver, RuiJSONFormat } from "../compiler-types";

const responseIWishIHad: RuiJSONFormat = {
  componentLibrary: "../rapid-components",
  eventHandlers: "./ExperimentScreen.events",

  id: "MainScreen",

  components: [
    {
      id: "user",
      component: "ComponentState",
      props: {
        initialValue: "Hello World",
      },
    },
  ],

  composition: [
    {
      id: "panel1",
      component: "Panel",
      props: {
        header: "Hello",
      },
      childContainers: {
        children: [
          {
            id: "text1",
            component: "Text",
            props: {
              content: "Hello world",
            },
          },
          {
            id: "button1",
            component: "Button",
            props: {
              caption: "Press me",
            },
            events: {
              onClick: "demoButtonClick",
            },
          },
          {
            id: "button2",
            component: "Button",
            props: {
              caption: "Disable other",
            },
            events: {
              onClick: "button2click",
            },
          },
        ],
      },
    },
  ],
};

export const convertRuiToJson = async (
  tsxSource: string,
  resolve: Resolver,
) => {
  //   const sourceFile = ts.createSourceFile("source.rui.tsx", tsxSource, {
  //     languageVersion: ts.ScriptTarget.Latest,
  //   });

  //   sourceFile.forEachChild((node) => {
  //     console.log(node);
  //   });

  return responseIWishIHad;
};
