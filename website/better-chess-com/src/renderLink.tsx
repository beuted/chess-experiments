import * as React from 'react';
import { styled } from '@mui/material/styles';

interface DemoLinkProps {
  href: string;
  children: string;
  tabIndex: number;
}

const Link = styled('a')({
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  color: 'inherit',
});

function getLinkInnerHtml(link: string) {
  return link.replace("https://lichess.org/", "lichess.org/").replace("https://www.chess.com/", "chess.com/")
}

export const DemoLink = React.memo(function DemoLink(props: DemoLinkProps) {
  return (
    <Link tabIndex={props.tabIndex} href={props.href} target="_blank">
      {props.children}
    </Link>
  );
});

export function renderLink(params: any) {
  if (params.rowNode.isAutoGenerated || !params.value) {
    return '';
  }

  return (
    <DemoLink href={params.value} tabIndex={params.tabIndex}>
      {getLinkInnerHtml(params.value)}
    </DemoLink>
  );
}